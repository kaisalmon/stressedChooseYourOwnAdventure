import axios from 'axios'
import {GameBook, GamePage, GameOption, GameEffect} from './game'

const DEFAULT_URL = 'https://spreadsheets.google.com/feeds/cells/1GpYB4WsAnJ9ATmot7agz2B1eSVgyaOuhLCkwIheyvgk/{ID}/public/full?alt=json';

interface GoogleSheetCell{
  content: {
    $t: string,
    type: string,
  },
  "gs$cell":{row:string, col:string}
}

interface GoogleSheet{
  feed:{
    entry:GoogleSheetCell[]
    title:{$t:string},
  }
}

function parseEffect(str:string): GameEffect{
  const effect = new GameEffect();

  const [keyword, ...args] = str.trim().split(/\s+/);

  if(keyword === 'GOTO') effect.goto = args[0]
  else if(keyword === 'DEBUG') effect.debug = args[0]
  else if(keyword === 'SET') effect.state[args[0]] = args[1]
  else if(keyword === 'TIME') effect.time = parseFloat(args[0]) * 1000
  else if(keyword === 'STRESS_SCALE') effect.stress_scale = parseFloat(args[0]) * 1000
  else if(keyword === 'STRESS') effect.stress = parseInt(args[0], 10)
  else throw new Error("Could not parse effect: "+str);

  return effect;
}

function parseAndApplyOptionAttribute(opt:GameOption, str:string): void{
  const [keyword, ...args] = str.trim().split(/\s+/);

  if(keyword === 'IF') opt.cond[args[0]] = args[1]
  else if(keyword === 'DEFAULT') opt.default = true;
  else if(keyword === 'SHOWIF') opt.showCond[args[0]] = args[1]
  else opt.effects.push(parseEffect(str));
}

function parseAndApplyPageAttribute(page:GamePage, str:string): void{
  const [keyword, ...args] = str.trim().split(/\s+/);

  if(keyword === 'START') page.start = true;
  else if(keyword === 'UNTIMED') page.untimed = true;
  else page.effects.push(parseEffect(str));
}


function processRow(row: GoogleSheetCell[], book:GameBook, prefix:string){
  const [idCell, textCell, ...effectCells] = row;
  if(idCell.content.$t === "")return;
  const pageId = prefix+idCell.content.$t;
  if(!book.pages[pageId]){
    book.pages[pageId] = new GamePage();
    const pageText =  textCell && textCell.content.$t;
    //todo initpage(row)
    if(!pageText) throw new Error("Can't find page text");
    book.pages[pageId].text = pageText;
    book.pages[pageId].prefix = prefix;
    for(let effectCell of effectCells){
      const {content:{$t}} = effectCell;
      parseAndApplyPageAttribute(book.pages[pageId], $t)
    }
    return;
  }else{
    const optionText = textCell && textCell.content.$t;
    const page = book.pages[pageId]
    if(optionText){
      const option = new GameOption()
      page.options.push(option);
      option.text = optionText;
      for(let effectCell of effectCells){
        const {content:{$t}} = effectCell;
        parseAndApplyOptionAttribute(option, $t)
      }
    }
  }
}

function toRows(cells: GoogleSheetCell[]): GoogleSheetCell[][]{
    const results:GoogleSheetCell[][] = [];
    let curRow:GoogleSheetCell[] = [];
    let curRowString: string|null = null;
    for(let cell of cells){
      if(cell.gs$cell.row != curRowString){
        curRow = [];
        curRowString = cell.gs$cell.row;
        results.push(curRow);
      }
      if(!curRow) throw new Error("Could not create row")
      curRow.push(cell)
    }
    return results;
}

function loadSheets({sheetUrl, book, batchSize, offset}:{sheetUrl:string, book:GameBook, batchSize:number, offset:number}):Promise<boolean>{
  const promises:Promise<boolean>[] = []
  for(let i = 0; i<batchSize; i++){
    const promise = axios.get<GoogleSheet>(sheetUrl.replace('{ID}',`${i+offset}`))
    .then(result => {
      const {data:{feed:{title, entry}}} = result
      const [titles, ...rows] = toRows(entry);
      for(let row of rows){
        processRow(row, book, title.$t)
      }
      return true
    }).catch((err)=>{
      if(err.message === "Network Error")return false
      throw err
    });
    promises.push(promise);
  }
  return Promise.all(promises).then(([...hadData])=>{
    return hadData.every(x=>x===true)
  });
}


async function loadBook(sheetUrl:string=DEFAULT_URL):Promise<GameBook>{
  const BATCHSIZE = 5;
  const book = new GameBook();
  let offset = 1;
  while(true){
      const hadData = await loadSheets({sheetUrl, book, batchSize: BATCHSIZE, offset: offset})
      offset+=BATCHSIZE;
      if(!hadData){
        break;
      }
      if(offset > 50){
          throw new Error("Over 50 pages, or more likely loading bug")
      }
  }
  const [startPage, ...otherStartPages] = Object.values(book.pages).filter(p=>p.start);
  if(!startPage) throw new Error("No page with Start attribute")
  if(otherStartPages.length > 0) throw new Error("More than one page with start attribute")
  book.startPage = startPage;
  return book;
}

export {loadBook}
