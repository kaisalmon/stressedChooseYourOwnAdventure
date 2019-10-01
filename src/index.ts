import {loadBook} from './sheetsloader';
import {GameState, GamePage, GameOption} from './game';
import * as $  from 'jquery';

import delay from 'delay';

async function setText(el: HTMLElement, text:string):Promise<void>{
  el.style.color = "black";
  await delay(600);
  el.innerText = text;
  el.style.color = "white";
}

async function addOption(el: HTMLElement, opt:GameOption, gameState:GameState):Promise<void>{
  if(opt.isHidden(gameState))return
  $('<div/>')
    .addClass('option')
    .addClass(opt.isLocked(gameState) ? 'locked' : '')
    .text(opt.text)
    .appendTo(el)
    .click(()=>{
      if(opt.isLocked(gameState)) return;
      gameState.processOption(opt);
    })

}

async function updatePage(el: HTMLElement, gameState:GameState):Promise<void>{
  const page = gameState.currentPage;
  await setText(el, page.text);
  for(let opt of page.options){
    addOption(el, opt, gameState)
  }
}


async function autorun()
{
  const book = await loadBook();
  const gameState = new GameState()
  gameState.book = book;
  gameState.setPage(book.startPage)

  const el = document.getElementById('main');
  if(!el) throw new Error("Cannot find main element")
  await delay(800)
  updatePage(el, gameState)
  gameState.onUpdate = (gs: GameState) => {
    updatePage(el, gs)
  }

}
if (document.addEventListener) document.addEventListener("DOMContentLoaded", autorun, false);
else window.onload = autorun;
