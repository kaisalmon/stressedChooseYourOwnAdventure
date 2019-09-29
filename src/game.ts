class GameState{
  book: GameBook
  currentPage:GamePage
  state: { [id: string] : string|number; } = {}
  onUpdate:(gs:GameState)=>void;

  public processOption(opt: GameOption){
    const nextPage = this.book.pages[opt.link];
    if(!nextPage) throw new Error("Cannot follow link "+opt.link)
    this.currentPage = nextPage;
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
}



export {GameState, GamePage, GameOption, GameBook};
