import axios from 'axios'
import {GameBook, GamePage, GameOption} from './game'

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
    return;
  }else{
    const optionText = textCell && textCell.content.$t;
    if(optionText){
      const page = book.pages[pageId]
      const option = new GameOption()
      option.text = optionText;
      for(let effectCell of effectCells){
        const {content:{$t}} = effectCell;
        const gotoRegex = /^\s*GOTO\s+(\w*)/;
        const gotoRegexMatch = gotoRegex.exec($t);
        if(gotoRegexMatch){
          option.link = gotoRegexMatch[1];
        }

        const setRegex = /^\s*SET\s+(\w*)\s+(\w*)/;
        const setRegexMatch = setRegex.exec($t);
        if(setRegexMatch){
          option.state[setRegexMatch[1]] =  setRegexMatch[2]||1;
        }

        const ifRegex = /^\s*IF\s+(\w*)\s+(\w*)/;
        const ifRegexMatch = ifRegex.exec($t);
        if(ifRegexMatch){
          option.cond[ifRegexMatch[1]] =  ifRegexMatch[2]||1;
        }
        const showIfRegex = /^\s*SHOWIF\s+(\w*)\s+(\w*)/;
        const showIfRegexMatch = showIfRegex.exec($t);
        if(showIfRegexMatch){
          option.showCond[showIfRegexMatch[1]] = showIfRegexMatch[2]||1;
        }
      }
      page.options.push(option);
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

async function loadBook(sheetUrl:string=DEFAULT_URL):Promise<GameBook>{
  const book = new GameBook();
  let i = 1;
  while(true){
    try{
      const result = await  axios.get<GoogleSheet>(sheetUrl.replace('{ID}',`${i++}`))
      const {data:{feed:{title, entry}}} = result
      console.log(result)
      const [titles, ...rows] = toRows(entry);
      for(let row of rows){
        processRow(row, book, title.$t)
      }
      console.log(book)
    }catch(e){
      console.error(e)
      break;
    }
  }
  return book;
}

export {loadBook}
