var possibleGoals = [WorldGoalTypes.RedCoins,WorldGoalTypes.Flowers,WorldGoalTypes.Stars, WorldGoalTypes.LevelClear, WorldGoalTypes.Game];
var WRAM_START = 0xF50000;
var bowserCastleDoorBytes: number[][] = [
   [0xB8, 0x05, 0x77, 0x00],
   [0xC6, 0x07, 0x7A, 0x00],
   [0xCD, 0x05, 0x5B, 0x00],
   [0xD3, 0x00, 0x77, 0x06]
];
var defaultBosses = 
  [BossTypes.Boss14, BossTypes.Boss18
  ,BossTypes.Boss24, BossTypes.Boss28
  ,BossTypes.Boss34, BossTypes.Boss38
  ,BossTypes.Boss44, BossTypes.Boss48
  ,BossTypes.Boss54, BossTypes.Boss58
  ,BossTypes.Boss64];

const worldGateRegex = /world (\d) gate/i;
const singleDigitRegex = /.*(\d).*/i;
function isArrayEquals<T>(a: Array<T>, b:Array<T>): boolean {
  if(!a||!b)
    return false;
  if(a.length!=b.length)
    return false;
  for(let i=0; i<a.length; i++) {
    if(a[i]!==b[i])
	  return false;
  }
  return true;
}

function getArchipelagoLocationName(goal : WorldGoal): string {
  let level: WorldLevel = goal.level;
  let typeID: string = goal.goalType;
  if(level.level === 10)
	 typeID = "Victory";
  if(typeID === "Game") 
	 typeID = "Bandit Game";
  return level.name+": "+typeID;
}

class Autotracker {
  private sniClient: SNIClient;
  private apClient: APClient;
  private state : State;
  private lastState: State;
  private lastLevelOrder: string[];
  private levelOrderChangeListener: {(order: string[]): void}[] = [];
  //private lastNumber : number[];
  //private diffNumber : number[];
  
  clearLastRecieved(): void {
    this.sniClient?.clearLastRecieved();
	this.lastLevelOrder = null;
  }
  
  addConnectionStatusListener(listener: {(connectionStatus: string): void }): number {
    return this.sniClient.addConnectionStatusListener((status)=>listener(status.length>0?"Autotracking Status: "+status:""));
  }
  
  addLevelOrderChangeListener(listener: {(order: string[]): void }): number {
    return this.levelOrderChangeListener.push(listener) - 1;
  }
  
  removeLevelOrderChangeListener(index: number) : void {
    this.levelOrderChangeListener[index] = null;
  }
  
  constructor() {
    this.state = state;
	this.lastState = lastState;
    this.sniClient = new SNIClient("ws://localhost:23074");
    this.apClient = new APClient("Yoshi's Island", this.state.gameOptions);
	this.apClient.checkedLocations.addListener(this.notifyNewArchipelagoLocationsChecked);
	this.apClient.itemsReceived.addListener(this.notifyArchipelagoItemList);
	this.apClient.slotData.addChangeListener((data)=>this.notifyArchipelagoSlotDataRecieved(this, data));
	this.apClient.allAvaillableLocations.addListener(this.notifyAllArchipelagoKnownLocations);
	this.apClient.hintsForLocations.addListener(this.notifyNewArchipelagoHints);
	
    this.sniClient.addDataSource("Title", 0x007FC0, 0X0015);
    this.sniClient.addDataSource("Options", 0x06FC80, 0X0040);
    this.sniClient.addDataSource("Collectables", 0x00, 0x0040, WRAM_START+0x1440);
    this.sniClient.addDataSource("Goals", 0x00, 0X0100, WRAM_START+0x146D);
    this.sniClient.addDataSource("LuigiPieces", 0x00, 0X0001, WRAM_START+0x14B5);
    this.sniClient.addDataSource("BowserCastleDoors", 0x00, 0X0010, 0x07891F);
    this.sniClient.addDataSource("BowserCastleLinkDoor1", 0x00, 0X0004, 0x0AF517);
    this.sniClient.addDataSource("Bosses", 0x00, 11, 0x06FC8D);
    this.sniClient.addDataSource("Levels", 0x00, 47, 0x11544B);
	
    //this.sniClient.addDataSource("All", 0x00, 0x2000, WRAM_START);
	
    this.sniClient.addDataChangeListener((data)=>this.notifyDataChanged(data));
  }
  
  connectToArchipelago(): void {
	  this.apClient.connect();
  }
  
  getArchipelagoConnectionStatusProperty(): Observable<string> {
	  return this.apClient.connectionStatus;
  }
  
  isConnectedToArchipelago(): Observable<boolean> {
	  return this.apClient.isConnected;
  }
  
  setPort(port: number) {
    this.sniClient.setURL(port?"ws://localhost:"+port:null);
  }
  
  private setCollectable(collectableType: CollectableTypes, value: boolean): void {
    let collectable : Collectable = this.state.collectables.get(collectableType);
	if(!collectable.value.get()&&value)
	  collectable.value.set(value);
  }
  private setCollectableEgg(value: number) {
    let collectable : Collectable = this.state.collectables.get(CollectableTypes.Egg);
	if(<number>collectable.value.get()<value)
	  collectable.value.set(value);
  }
  private setStateOptionIfChanged(gameOption: GameOptions, value: string|number|boolean) : void {
	if(this.lastState.gameOptions.get(gameOption) !== value)
	  this.state.gameOptions.set(gameOption,value);
	this.lastState.gameOptions.set(gameOption,value);
  }
  
  setLevelList(levelList: string[]): void {
	if(!isArrayEquals(levelList, this.lastLevelOrder)) {
	  this.levelOrderChangeListener.filter(listener=>listener).forEach(listener=>listener(levelList));
	}
	this.lastLevelOrder = levelList;
  }
  private notifyDataChanged(data: Map<string, RomData>) {
    let optVals: RomData = data.get("Options");
	let optionShuffleMidrings = optVals.getDataAsNumber(0x06FC88);
	let optionStartWorld: number = optVals.getDataAsNumber(0x06FC83)+1;	
	this.setStateOptionIfChanged(GameOptions.MinigameBandit, optVals.getDataAsBoolean(0x06FC8B, 0x01));
	this.setStateOptionIfChanged(GameOptions.MinigameBonus, optVals.getDataAsBoolean(0x06FC8B, 0x02));
	this.setStateOptionIfChanged(GameOptions.Goal, optVals.getDataAsNumber(0x06FC9A).toString());
	this.setStateOptionIfChanged(GameOptions.LuigiPiecesRequired, optVals.getDataAsNumber(0x06FC99));
	this.setStateOptionIfChanged(GameOptions.BowserCastleEnter, optVals.getDataAsNumber(0x06FC85));
	this.setStateOptionIfChanged(GameOptions.BowserCastleClear, optVals.getDataAsNumber(0x06FC86));
	
	let colVals = data.get("Collectables");
    this.setCollectable(CollectableTypes.Switch, colVals.getDataAsBoolean(0x00));
    this.setCollectable(CollectableTypes.DashedPlatform, colVals.getDataAsBoolean(0x01));
    this.setCollectable(CollectableTypes.DashedStairs, colVals.getDataAsBoolean(0x02));
    this.setCollectable(CollectableTypes.Beanstalk, colVals.getDataAsBoolean(0x03));
    this.setCollectable(CollectableTypes.MorphHelicopter, colVals.getDataAsBoolean(0x04));
    this.setCollectable(CollectableTypes.MorphMoleTank, colVals.getDataAsBoolean(0x05));
    this.setCollectable(CollectableTypes.MorphTrain, colVals.getDataAsBoolean(0x06));
    this.setCollectable(CollectableTypes.MorphCar, colVals.getDataAsBoolean(0x07));
    this.setCollectable(CollectableTypes.MorphSubmarine, colVals.getDataAsBoolean(0x08));
    this.setCollectable(CollectableTypes.SpringBallSmall, colVals.getDataAsBoolean(0x09));
    this.setCollectable(CollectableTypes.SpringBallLarge, colVals.getDataAsBoolean(0x0A));
    this.setCollectable(CollectableTypes.ArrowWheel, colVals.getDataAsBoolean(0x0B));
    this.setCollectable(CollectableTypes.VanishingArrowWheel, colVals.getDataAsBoolean(0x0C));
    this.setCollectable(CollectableTypes.Watermelon, colVals.getDataAsBoolean(0x0D));
    this.setCollectable(CollectableTypes.Icemelon, colVals.getDataAsBoolean(0x0E));
    this.setCollectable(CollectableTypes.Firemelon, colVals.getDataAsBoolean(0x0F));
    this.setCollectable(CollectableTypes.SuperStar, colVals.getDataAsBoolean(0x10));
    this.setCollectable(CollectableTypes.FlashingEgg, colVals.getDataAsBoolean(0x11));
    this.setCollectable(CollectableTypes.GiantEgg, colVals.getDataAsBoolean(0x12));
    this.setCollectable(CollectableTypes.EggLauncher, colVals.getDataAsBoolean(0x13));
    this.setCollectable(CollectableTypes.EggPlant, colVals.getDataAsBoolean(0x14));
    this.setCollectable(CollectableTypes.ChompRock, colVals.getDataAsBoolean(0x15));
    this.setCollectable(CollectableTypes.Poochy, colVals.getDataAsBoolean(0x16));
    this.setCollectable(CollectableTypes.PlatformGhost, colVals.getDataAsBoolean(0x17));
    this.setCollectable(CollectableTypes.Ski, colVals.getDataAsBoolean(0x18));
    this.setCollectable(CollectableTypes.Key, colVals.getDataAsBoolean(0x19));
    this.setCollectable(CollectableTypes.Midring, colVals.getDataAsBoolean(0x1A)||!optionShuffleMidrings);
    this.setCollectable(CollectableTypes.Bucket, colVals.getDataAsBoolean(0x1B));
    this.setCollectable(CollectableTypes.Tulip, colVals.getDataAsBoolean(0x1C));
    this.setCollectableEgg(colVals.getDataAsNumber(0x1D));
	
	let goalVals: RomData = data.get("Goals");
	for(let [id,lvl] of this.state.worldLevels) {
	  let offset =  (lvl.world-1)*12+lvl.level-1;
	  for(let i: number = 0; i<5; i++) {
		let goal = lvl.goals.get(possibleGoals[i]);
		if(goal&&((!lvl.isBowserLevel())||goal.goalType != WorldGoalTypes.LevelClear)) {
		  let targetValue : boolean = goalVals.getDataAsBoolean(offset, 1<<i);
		  if(targetValue) {
		    goal.completed.set(targetValue);
			if(goal.level.isBossLevel()&&goal.goalType == WorldGoalTypes.LevelClear) {
				goal.level.isBossDefeated.set(targetValue); // Make sure BossDefeated is set when goal is already set by Archipelago
			}
		  }
		}
	  }
	}
	let worldState: number = colVals.getDataAsNumber(0x20);
	let extraLevelState: number = colVals.getDataAsNumber(0x21);
	let bonusLevelState: number = colVals.getDataAsNumber(0x22);
	for(let world=1; world<=6; world++) {
	  if(!state.worldOpen.get(world)&&((worldState&(1<<(world-1)))!=0||world===optionStartWorld))
	    state.worldOpen.set(world, true);
	  let extraStage = state.worldLevels.get(world+"-E");
	  if(extraStage.locked.get()&&(extraLevelState&(1<<(world-1)))!=0) {
	    extraStage.locked.set(false);
		this.setStateOptionIfChanged(GameOptions.ExtraLevel, true);
	  }
	  let bonusStage = state.worldLevels.get(world+"-B");
	  if(bonusStage.locked.get()&&(bonusLevelState&(1<<(world-1)))!=0)
	    bonusStage.locked.set(false);
	}
	
	let luigiPieces: number = data.get("LuigiPieces").getDataAsNumber(0);
	if(this.lastState.luigiPieces.get() !== luigiPieces)
	  this.state.luigiPieces.set(luigiPieces);
	this.lastState.luigiPieces.set(luigiPieces);
	
	let bowserDoor1: number[] = data.get("BowserCastleDoors").getDataAsNumberArray(0x00, 4);
	let bowserDoor2: number[] = data.get("BowserCastleDoors").getDataAsNumberArray(0x04, 4);
	let bowserLink1: number[] = data.get("BowserCastleLinkDoor1").getDataAsNumberArray(0x00, 4);
	if(!isArrayEquals(bowserDoor1, bowserDoor2)) {
	  this.setStateOptionIfChanged(GameOptions.BowserCastleRoute, "Door Selectable");
	} else if(isArrayEquals(bowserLink1, bowserCastleDoorBytes[1])) {
	  this.setStateOptionIfChanged(GameOptions.BowserCastleRoute, "Gaunlet");
	} else if(isArrayEquals(bowserDoor1, bowserCastleDoorBytes[0])) {
	  this.setStateOptionIfChanged(GameOptions.BowserCastleRoute, "Door1");
	} else if(isArrayEquals(bowserDoor1, bowserCastleDoorBytes[1])) {
	  this.setStateOptionIfChanged(GameOptions.BowserCastleRoute, "Door2");
	} else if(isArrayEquals(bowserDoor1, bowserCastleDoorBytes[2])) {
	  this.setStateOptionIfChanged(GameOptions.BowserCastleRoute, "Door3");
	} else if(isArrayEquals(bowserDoor1, bowserCastleDoorBytes[3])) {
	  this.setStateOptionIfChanged(GameOptions.BowserCastleRoute, "Door4");
	} 
	
	let bossData: RomData = data.get("Bosses");
	let bosses: BossTypes[] = new Array();
	for(let i=0; i<11; i++) {
	  bosses.push(defaultBosses[bossData.getDataAsNumber(i)]);
	}
	
	if(isArrayEquals(bosses, defaultBosses)) {
	  this.setStateOptionIfChanged(GameOptions.BossShuffle, false);
	} else {
	  this.setStateOptionIfChanged(GameOptions.BossShuffle, true);
	  if(<boolean> this.state.gameOptions.get(GameOptions.SpoilerBosses)) {
	    for(let i=0; i<11; i++) {
		  this.state.getLevel(Math.floor(i/2)+1, (i%2+1)*4).setBossByType(bosses[i]);
		}	    
	  }
	}
	
	let level21RomId:number = 0x0C;
	this.setLevelList(data.get("Levels").getDataAsNumberArray(0, 47).map(
	  (id)=>(Math.floor(id/level21RomId)+1)+"-"+(id%level21RomId+1)
	));
	
	/* Code Snippet to search for changes in SNES-Data
	let curNumber = Array.from(data.get("All").data);
	
	if(!this.diffNumber)
	  this.diffNumber = new Array(curNumber.length);
	if(this.lastNumber) {
	  let j=0;
	  for(let i=0; i<curNumber.length; i++) {
	    if(!this.diffNumber[i])
		  this.diffNumber[i]=0;
	    this.diffNumber[i] += this.diffNumber[i]<10&&this.lastNumber[i]!=curNumber[i]?1:0;
		if(j<10&&this.diffNumber[i]===1) {
		  j++;
		  console.log("Diff: "+i.toString(16));
		 }
	  }
	}
	this.lastNumber = curNumber;*/
	
  }
  private notifyArchipelagoItemList(collectables: Array<string>): void {
	  let eggs: number = 1;
	  let luigiPieces: number = 0;
	  let worldsFound: number = 0;
	  for(let collectable of collectables) {
        let col : Collectable = this.state.collectables.get(<CollectableTypes> collectable);
	    
		if(col) {
			col.value.set(true);
			continue;
		} 
		if (collectable === "Egg Capacity Upgrade"&& eggs < 6) {
			eggs++;
			continue;
		} 
		if (collectable === "Piece of Luigi") {
			luigiPieces++;
			continue;
		} 
		
		let world:number = 0;
		let regMatch = collectable.match(singleDigitRegex);
		if(regMatch)
			world = ~~regMatch[1];
		if(collectable.match(worldGateRegex)) {
			worldsFound++;
			this.state.worldOpen.set(world, true);
			continue;
		}
		if(collectable.startsWith("Extra ")) {
			if(world > 0) 
				this.state.getLevel(world, 9).locked.set(false);
			else { // Extra Panel
				for (let i: number = 1; i<=6; i++)
				  this.state.getLevel(i, 9).locked.set(false);
			}
			continue;
		}
		if(collectable.startsWith("Bonus ")) {
			if(world > 0) 
				this.state.getLevel(world, 10).locked.set(false);
			else { // Bonus Panel
				for (let i: number = 1; i<=6; i++)
				  this.state.getLevel(i, 10).locked.set(false);
			}
			continue;
		}
	  }
	  
      let colEgg: Collectable = this.state.collectables.get(CollectableTypes.Egg);
	  if(<number>colEgg.value.get()<eggs)
	    colEgg.value.set(eggs);
	  if(this.state.luigiPieces.get() < luigiPieces) {
		  this.state.luigiPieces.set(luigiPieces);
	  }
	  if(worldsFound>=5) {
		  // 5 world gates found - last one must be startWorld so open that up too
		  for (let i: number = 1; i<=6; i++)
			this.state.worldOpen.set(i, true);
	  }
  }
  private notifyNewArchipelagoLocationsChecked(locations: Array<string>): void {
	  this.state.worldGoals.forEach((goal: WorldGoal, key: string) => {
			  if(locations.indexOf(getArchipelagoLocationName(goal))>-1) {
				   let isBossDefeated: boolean = goal.level.isBossDefeated.get();
				   goal.completed.set(true);
				   goal.level.isBossDefeated.set(isBossDefeated); // Make sure Archipelago doesn't change defeated-flag
			  }
	  });
  }
  private notifyNewArchipelagoHints(apHints: Array<HintForLocation>): void {
	  let hintMap: Map<string, HintForLocation> = new Map(apHints.map(obj => [obj.location_name, obj]));
	  this.state.worldGoals.forEach((goal: WorldGoal, key: string) => {
		  let hint: HintForLocation = hintMap.get(getArchipelagoLocationName(goal));
		  if(!goal.hint.get()&&hint) {
			 goal.hint.set(hint);
		  }
	  });
  }
  private notifyArchipelagoSlotDataRecieved(tracker: Autotracker, slotData: any): void {
	  if(slotData) {
		  let levelList: string[] = new Array();
		  for(let world: number = 1; world<=6; world++) {
			  for(let level: number = 1; level<=8; level++) {
				  let pos: number = slotData["world_"+world][level-1];
				  levelList.push((Math.floor(pos/12)+1)+"-"+(pos%12+1));
			  }
		  }
		  tracker.setLevelList(levelList);
	  }
  }
  private notifyAllArchipelagoKnownLocations(locations: Array<string>): void {
	  let hasBanditGame = locations.indexOf(getArchipelagoLocationName(this.state.getGoal(1, 3, WorldGoalTypes.Game))) > -1;
	  let hasExtraLevel = locations.indexOf(getArchipelagoLocationName(this.state.getGoal(1, 9, WorldGoalTypes.LevelClear))) > -1;
	  let hasBonusLevel = locations.indexOf(getArchipelagoLocationName(this.state.getGoal(1, 10, WorldGoalTypes.Game))) > -1;
	  this.state.gameOptions.set(GameOptions.ExtraLevel, hasExtraLevel);
	  this.state.gameOptions.set(GameOptions.MinigameBandit, hasBanditGame);
	  this.state.gameOptions.set(GameOptions.MinigameBonus, hasBonusLevel);
  }
}