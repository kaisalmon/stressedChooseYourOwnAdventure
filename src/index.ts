import {loadBook} from './sheetsloader';
import {GameState, GameOption} from './game';
import * as $  from 'jquery';

import delay from 'delay';

let blockInput = false;

async function setText(el: HTMLElement, text:string):Promise<void>{
  el.style.color = "black";
  await delay(600);
  el.innerText = text;
  el.style.color = "white";
}

async function addOption(el: HTMLElement, opt:GameOption, gameState:GameState, isDefault:boolean):Promise<void>{
  if(opt.isHidden(gameState))return
  $('<div/>')
    .addClass('option')
    .addClass(opt.isLocked(gameState) ? 'locked' : '')
    .addClass(isDefault ? 'default' : '')
    .text(opt.text)
    .appendTo(el)
    .click(()=>{
      if(opt.isLocked(gameState)) return;
      if(blockInput) return;
      gameState.processOption(opt);
    })

}

async function updatePage(el: HTMLElement, gs:GameState):Promise<void>{
  const page = gs.currentPage;
  blockInput = true
  await setText(el, page.text);
  blockInput = false
  const defaultOption = page.getDefaultOption(gs);
  for(let opt of page.options){
    addOption(el, opt, gs, defaultOption===opt)
  }
  if(!gs.time || !gs.stress_scale || gs.currentPage.untimed || !gs.currentPage.getDefaultOption(gs)){
    $('.pie').fadeOut();
  }
}

function updatePie({stressValue, elapsedValue, remainingValue}:{stressValue:number, elapsedValue:number, remainingValue:number}){
  $('#stress')[0].style.setProperty('--value', `${stressValue}`)
  $('#stress')[0].style.setProperty('--offset', '0')
  $('#stress')[0].style.setProperty('--over50', stressValue > 50 ? '1' : '0')
  $('#elapsedTime')[0].style.setProperty('--value', `${elapsedValue}`)
  $('#elapsedTime')[0].style.setProperty('--offset', `${stressValue}`)
  $('#elapsedTime')[0].style.setProperty('--over50', elapsedValue > 50 ? '1' : '0')
  $('#remainingTime')[0].style.setProperty('--value', `${remainingValue}`)
  $('#remainingTime')[0].style.setProperty('--offset', `${stressValue+elapsedValue}`)
  $('#remainingTime')[0].style.setProperty('--over50', remainingValue > 50 ? '1' : '0')
}

async function autorun()
{
  try{
    const book = await loadBook();
    const gameState = new GameState()
    gameState.book = book;
    gameState.setPage(book.startPage)

    const el = document.getElementById('main');
    if(!el) throw new Error("Cannot find main element")
    await delay(800)
    updatePage(el, gameState)
    gameState.onPageChanged = (gs: GameState) => {
      updatePage(el, gs)
    }
    gameState.onTimerUpdate = (gs: GameState, t:number) => {
      if(!gs.time || !gs.stress_scale || gs.currentPage.untimed || !gs.currentPage.getDefaultOption(gs)){
        $('.pie').fadeOut();
        return;
      }
      $('.pie').fadeIn();
      $('.pie').removeClass('heartBeat animated');
      const stressValue = (gs.stress * gs.stress_scale) / gs.time * 100;
      const elapsedValue = (gs.elapsedTime - gs.stress * gs.stress_scale) / gs.time * 100;;
      const remainingValue = (gs.time - gs.elapsedTime) / gs.time * 100;
      updatePie({stressValue, elapsedValue, remainingValue})
      if(remainingValue < 20){
        $('.option.default').addClass('highlight');
        $('.option.default').addClass('heartBeat animated');
        $('.pie').addClass('heartBeat animated');
      }
    }
  }catch(err){
    console.error(err)
    alert(err)
  }
}
console.log({autorun})
if (document.addEventListener) document.addEventListener("DOMContentLoaded", autorun, false);
else window.onload = autorun;
