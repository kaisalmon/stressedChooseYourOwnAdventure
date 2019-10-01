const TIMER_RES = 50;

class GameState{
  book: GameBook
  private _currentPage:GamePage

  elapsedTime:number = 0;
  intervalId: NodeJS.Timeout|undefined

  state: { [id: string] : string|number; } = {}
  time: number|undefined
  stress: number = 0
  stress_scale: number|undefined

  onPageChanged:(gs:GameState)=>void;
  onTimerUpdate:(gs:GameState, elapsedTime:number)=>void;

  public setPage(page: GamePage){
    this._currentPage = page
    for(let eff of page.effects){
      eff.execute(this.currentPage, this)
    }
    if(this.intervalId) clearInterval(this.intervalId)
    if(this.time && this.stress_scale && !page.untimed){
      this.elapsedTime = this.stress * this.stress_scale
      this.intervalId = setInterval(()=>{
        this.elapsedTime += TIMER_RES;
        if(this.onTimerUpdate) this.onTimerUpdate(this, this.elapsedTime)
        if(!this.time || this.elapsedTime >= this.time){
          if(this.intervalId) clearInterval(this.intervalId)
          const opt = this.currentPage.getDefaultOption(this);
          if(opt) this.processOption(opt);
        }
      }, TIMER_RES)
    }else{
      this.elapsedTime = 0
    }
  }

  public get currentPage(): GamePage {
     return this._currentPage;
  }

  public processOption(opt: GameOption){
    for(let eff of opt.effects){
      eff.execute(this.currentPage, this)
    }
    if(this.onPageChanged){
      this.onPageChanged(this);
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
  untimed: boolean = false;

  public getDefaultOption(gs:GameState): GameOption{
    const options = this.options
                      .filter(o=>!o.isLocked(gs))
                      .filter(o=>!o.isHidden(gs))
    return options.find(o=>o.default) || options[0]
  }
}
class GameOption{
  text: string
  effects: GameEffect[] = []
  cond: { [id: string] : string|number; } = {}
  showCond: { [id: string] : string|number; } = {}
  default: boolean = false

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
  time: number|undefined
  stress: number|undefined
  stress_scale: number|undefined

  public execute(page:GamePage, gs:GameState){
    gs.state = {...gs.state, ...this.state};

    if(this.goto){
      const {prefix} = page;
      const nextPage = gs.book.pages[prefix + this.goto] || gs.book.pages[this.goto];
      if(!nextPage) throw new Error("Cannot follow link "+this.goto)
      gs.setPage(nextPage)
    }

    if(this.debug){
      alert(this.debug)
      console.log({gameState: gs})
    }
    if(this.stress) gs.stress += this.stress;
    if(this.stress_scale) gs.stress_scale = this.stress_scale
    if(this.time) gs.time = this.time;
  }
}


export {GameState, GamePage, GameOption, GameBook, GameEffect};
