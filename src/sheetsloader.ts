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
  const gotoRegex = /^\s*GOTO\s+(\w*)/;
  const gotoRegexMatch = gotoRegex.exec(str);
  if(gotoRegexMatch){
    effect.goto = gotoRegexMatch[1];
    return effect;
  }

  const debugRegex = /^\s*DEBUG\s+(\w*)/;
  const debugRegexMatch = debugRegex.exec(str);
  if(debugRegexMatch){
    effect.debug = debugRegexMatch[1];
    return effect;
  }

  const setRegex = /^\s*SET\s+(\w*)\s+(\w*)/;
  const setRegexMatch = setRegex.exec(str);
  if(setRegexMatch){
    effect.state[setRegexMatch[1]] =  setRegexMatch[2]||1;
    return effect;
  }

  throw new Error("Could not parse effect: "+str);
}

function processRow(row: GoogleSheetCell[], book:GameBook, prefix:string){
  const [idCell, textCell, ...effectCells] = row;

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
      book.pages[pageId].effects.push(parseEffect($t));
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
        const ifRegex = /^\s*IF\s+(\w*)\s+(\w*)/;
        const ifRegexMatch = ifRegex.exec($t);
        if(ifRegexMatch){
          option.cond[ifRegexMatch[1]] =  ifRegexMatch[2]||1;
          return;
        }
        const showIfRegex = /^\s*SHOWIF\s+(\w*)\s+(\w*)/;
        const showIfRegexMatch = showIfRegex.exec($t);
        if(showIfRegexMatch){
          option.showCond[showIfRegexMatch[1]] = showIfRegexMatch[2]||1;
          return;
        }
        option.effects.push(parseEffect($t));
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
  console.log(book)
  return book;
}

export {loadBook}
