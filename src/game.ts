class GameState{
  book: GameBook
  private _currentPage:GamePage
  state: { [id: string] : string|number; } = {}
  onUpdate:(gs:GameState)=>void;

  public setPage(page: GamePage){
    this._currentPage = page
    for(let eff of page.effects){
      eff.execute(this.currentPage, this)
    }
  }
  public get currentPage(): GamePage {
     return this._currentPage;
  }

  public processOption(opt: GameOption){
    for(let eff of opt.effects){
      eff.execute(this.currentPage, this)
    }
    if(this.onUpdate){
      this.onUpdate(this);
    }
  }
}

class GameBook{
  pages: { [id: string] : GamePage; } = {}
  startPage:GamePage
}
class GamePage{
  id: string
  text: string
  prefix: string
  options: GameOption[] = []
  effects: GameEffect[] = []
  start: boolean = false;
}
class GameOption{
  text: string
  effects: GameEffect[] = []
  cond: { [id: string] : string|number; } = {}
  showCond: { [id: string] : string|number; } = {}

  public isLocked(gs:GameState):boolean{
    for(let key in this.cond){
      if(gs.state[key]!=this.cond[key]) return true;
    }
    return false;
  }
  public isHidden(gs:GameState):boolean{
    for(let key in this.showCond){
      if(gs.state[key]!=this.showCond[key]) return true;
    }
    return false;
  }
}

class GameEffect{
  state: { [id: string] : string|number; } = {}
  goto: string|undefined
  debug: string|undefined

  public execute(page:GamePage, gs:GameState){
    if(this.goto){
      const {prefix} = page;
      const nextPage = gs.book.pages[prefix + this.goto] || gs.book.pages[this.goto];
      if(!nextPage) throw new Error("Cannot follow link "+this.goto)
      gs.setPage(nextPage)
    }
    gs.state = {...gs.state, ...this.state};
    if(this.debug){
      alert(this.debug)
    }
  }
}


export {GameState, GamePage, GameOption, GameBook, GameEffect};
