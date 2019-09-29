import axios from 'axios'
import {GameBook, GamePage, GameOption} from './game'

const DEFAULT_URL = 'https://spreadsheets.google.com/feeds/cells/1GpYB4WsAnJ9ATmot7agz2B1eSVgyaOuhLCkwIheyvgk/1/public/full?alt=json';

interface GoogleSheetCell{
  content: {
    "$t": string,
    type: string,
  },
  "gs$cell":{row:string, col:string}
}

interface GoogleSheet{
  feed:{
    entry:GoogleSheetCell[]
  }
}

function processRow(row: GoogleSheetCell[], book:GameBook){
  const [idCell, textCell, ...effectCells] = row;

  const pageId = idCell.content.$t;
  if(!book.pages[pageId]){
    book.pages[pageId] = new GamePage();
    const pageText =  textCell && textCell.content.$t;
    //todo initpage(row)
    if(!pageText) throw new Error("Can't find page text");
    book.pages[pageId].text = pageText;
    return;
  }else{
    const optionText = textCell && textCell.content.$t;
    if(optionText){
      const page = book.pages[pageId]
      const option = new GameOption()
      option.text = optionText;
      for(let effectCell of effectCells){
        const {content:{$t}} = effectCell;
        const gotoRegex = /\s*GOTO\s+(.*)/;
        const gotoRegexMatch = gotoRegex.exec($t);
        if(gotoRegexMatch){
          option.link = gotoRegexMatch[1];
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
  const {data:{feed:{entry}}} = await  axios.get<GoogleSheet>(sheetUrl)

  const [titles, ...rows] = toRows(entry);

  for(let row of rows){
    processRow(row, book)
  }

  return book;
}

export {loadBook}
