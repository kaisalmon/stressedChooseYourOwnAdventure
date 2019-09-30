class GameState{
  book: GameBook
  currentPage:GamePage
  state: { [id: string] : string|number; } = {}
  onUpdate:(gs:GameState)=>void;

  public processOption(opt: GameOption){
    const nextPage = this.book.pages[opt.link];
    if(!nextPage) throw new Error("Cannot follow link "+opt.link)
    this.currentPage = nextPage;
    this.state = {...this.state, ...opt.state};
    if(this.onUpdate){
      this.onUpdate(this);
    }
  }
}
class GameBook{
  pages: { [id: string] : GamePage; } = {}
}
class GamePage{
  id: string
  text: string
  options: GameOption[] = []
}
class GameOption{
  text: string
  link: string
  state: { [id: string] : string|number; } = {}
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



export {GameState, GamePage, GameOption, GameBook};
