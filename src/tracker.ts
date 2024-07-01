import { WorldGoalTypes, BossTypes, BowserCastleRouteTypes, CollectableTypes, EvaluationState, GameOptions } from "./model/types";

class Observable<T> {
  private value: T;
  private changeListener: {(value: T): void}[] = [];
  set(value:T): void {
    let changed: boolean = (value !== this.value);
	this.value = value;
	if(changed)
	  this.changeListener.filter(listener=>listener).forEach(listener=>listener(value));
  }
  get(): T {
    return this.value;
  }
  addChangeListener(listener: {(value: T): void }): number {
    return this.changeListener.push(listener) - 1;
  }
  
  removeChangeListener(index: number) : void {
    this.changeListener[index] = null;
  }
}
class ObservableMap<S,T> {
  private map: Map<S,T> = new Map<S,T>();
  private changeListener: {(key: S, value: T): void }[] = [];
  
  set(key: S, value: T): void {
    let changed = this.map.get(key) !== value;
    this.map.set(key, value);
	if(changed) 
	  this.changeListener.filter(listener=>listener).forEach(listener=>listener(key, value));
  }
  
  get(key: S): T {
    return this.map.get(key);
  }
  addChangeListener(listener: {(key: S, value: T): void }): number {
    return this.changeListener.push(listener) - 1;
  }
  
  removeChangeListener(index: number) : void {
    this.changeListener[index] = null;
  }
}
abstract class WorldLevel {
  readonly world: number;
  readonly level: number;
  readonly name: string;
  readonly locked: Observable<boolean>;
  readonly boss : Observable<Boss>;
  goals: Map<WorldGoalTypes,WorldGoal> = new Map<WorldGoalTypes,WorldGoal>();
  abstract getId() : string;
  abstract isBossLevel() : boolean;
  abstract isBowserLevel() : boolean;
  abstract toggleGoalsCompleted() : void;
  abstract switchBossWithLevel(other: WorldLevel): void;
  abstract toggleLocked(): void;
  abstract setBossByType(bossType: BossTypes): void;
  
  htmlElement: HTMLElement;
  htmlImage: HTMLImageElement;
  htmlGoals: HTMLElement;
}
abstract class WorldGoal {
  // included from logic.ts:
  readonly goalType: WorldGoalTypes;
  readonly level: WorldLevel;
  readonly completed: Observable<boolean>;
  
  abstract getId() : string;
  abstract getRulesAsStrings(evalState: EvaluationState): Map<string, string>;
  abstract evaluateRules(evalState: EvaluationState) : boolean;
  
  // addtional layout information:
  htmlImage: HTMLImageElement;
  htmlImageSubstitute: HTMLImageElement;
  htmlImageLenseNeeded: HTMLImageElement;
  htmlImageBeatableWithHarderDifficulty: HTMLImageElement;
}
abstract class Boss {
  readonly id: BossTypes;
}
abstract class Collectable {
  // included from logic.ts:
  readonly collectableType: CollectableTypes;
  readonly value: Observable<boolean|number>;
  readonly minValue? : number;
  readonly maxValue? : number;
  
  abstract toggle() : void;
  
  // addtional layout information:
  htmlImage: HTMLImageElement;
  htmlImageSubstitute: HTMLImageElement;
}
abstract class State {
  readonly worldLevels: Map<string, WorldLevel>;
  readonly worldGoals: Map<string, WorldGoal>;
  readonly collectables: Map<CollectableTypes, Collectable>;
  readonly worldOpen: ObservableMap<number, boolean> ;
  readonly gameOptions: ObservableMap<GameOptions, string|number|boolean> ;
  readonly luigiPieces: Observable<number>;
  readonly checksTotal: Observable<number>;
  readonly checksCompleted: Observable<number>;
  readonly bossesTotal: Observable<number>;
  readonly bossesCompleted: Observable<number>;
  abstract getGoal(world: number, level: number, goaltype: WorldGoalTypes) : WorldGoal;
  abstract toggleWorldOpen(world:number):void;
}
abstract class Autotracker {
  abstract addConnectionStatusListener(listener: {(connectionStatus: string): void }): number;
  abstract addLevelOrderChangeListener(listener: {(order: string[]): void }): number;
  abstract setPort(port: number): void;
  abstract clearLastRecieved(): void;
}

var optionSpoilerBosses: boolean = false;
var state : State;
var levelNames: Map<string, string>;
const difficultyNames = ["Strict","Loose","Expert","All known"];
const difficultyGlitched = difficultyNames.length - 1;

function getWorldGoalId(world:number, level: number, goaltype: WorldGoalTypes) : string {
  return state.getGoal(world, level, goaltype).getId();
}
var collectablesPerRow = 10;
var collectableList = Array.from(state.collectables.keys());
var collectableListStorage = "YoshisIslandTrackerCollectableOrder";
var difficultyStorage = "YoshisIslandTrackerDifficulty";
var showHardModeStorage = "YoshisIslandTrackerShowHardMode";
var createAutotracker: {(): Autotracker };
var autotracker: Autotracker;
{ 
    collectableList = loadOrderFromLocalStorage(collectableList, collectableListStorage);
	if(!window.localStorage.getItem(difficultyStorage))
	  window.localStorage.setItem(difficultyStorage, "1");
	state.gameOptions.set(GameOptions.Difficulty, parseInt(window.localStorage.getItem(difficultyStorage)));
	state.gameOptions.set(GameOptions.HarderDifficulty, parseInt(window.localStorage.getItem(showHardModeStorage)));
}

var isGoalRequirementsHighlighted = false;

function resetCollectableList() : void {
  collectableList = Array.from(state.collectables.keys());
  saveOrderToLocalStorage(collectableList, collectableListStorage);
  setupCollectablesInHTML();
}
function moveElement<Type>(array: Type[], fromIndex: number, toIndex: number): Type[] {
    let startEntry = array[fromIndex];
    if(toIndex>fromIndex) {
      for(let i = fromIndex; i < toIndex; i++) {
        array[i] = array[i+1];
      }
      array[toIndex] = startEntry;
    } else if(toIndex<fromIndex) {
      for(let i = fromIndex; i > toIndex; i--) {
        array[i] = array[i-1];
      }
      array[toIndex] = startEntry;
    }
	return array;
}
function loadOrderFromLocalStorage<Type>(array: Type[], key: string): Type[] {
  let order = window.localStorage.getItem(key)?.split(",");
  if(order) {
    array.sort((a,b) => 
	   {let result = order.indexOf(a.toString()) - order.indexOf(b.toString())
	     if (result != 0) return result;
		 return a.toString().localeCompare(b.toString());
	   });
  }
  return array;
}
function saveOrderToLocalStorage<Type>(array: Type[], key: string): void {
  window.localStorage.setItem(key, array.toString());
}

function getCollectableImageURL(collectable: Collectable) : string {
	let result : string =  "images/collectables/" + collectable.collectableType;
	let value : number|boolean = collectable.value.get();
	if(typeof value === "boolean") {
		if(!<boolean>value) {
		  result += "_unchecked";
		}
	} else {
		result += "_"+value;
	}
	return result+".png";
}

function checkForConsumable(goal: WorldGoal, target: CollectableTypes, difficulty: number): boolean {
	let canBeSubstitutedByConsumable = goal.evaluateRules({
	  collectables: new Map<CollectableTypes, boolean|number>(Array.from(state.collectables).map(([key, collectable])=>[key, collectable.value.get()])),
	  difficulty: difficulty,
	  consumableEgg: target===CollectableTypes.Egg,
	  consumableWatermelon: target===CollectableTypes.Watermelon,
	  canSeeClouds: true
	});
	if(canBeSubstitutedByConsumable&&goal.htmlImageSubstitute) {
	    goal.htmlImageSubstitute.src = "images/collectables/" + target + "_substitute.png";
		goal.htmlImageSubstitute.classList.add("hasSubstitute");
	}
	return canBeSubstitutedByConsumable;
}

function updateLevelState(level: WorldLevel) {
  let isLevelFinished: boolean = true;
  let isGoalOpen: boolean = false;
  for(let [goalId, goal] of level.goals.entries()) {
    if(goal.goalType==WorldGoalTypes.Game) {
	  if(goal.level.level == 10&&!state.gameOptions.get(GameOptions.MinigameBonus))
	    continue;
	  if(goal.level.level < 10&&!state.gameOptions.get(GameOptions.MinigameBandit))
	    continue;
	}
    if(!goal.completed.get()) {
	  isLevelFinished = false;
	  if(goal.htmlImage&&!goal.htmlImage.classList.contains("blocked"))
	    isGoalOpen = true;
	}
  }
  level.htmlElement.classList.toggle("isFinished", isLevelFinished);
  level.htmlElement.classList.toggle("isLocked", level.locked.get());
  level.htmlElement.classList.toggle("noOpenGoals", !isLevelFinished&&!isGoalOpen);
}
function updateAllLevelState() {
  for (let [lvlId,lvl] of state.worldLevels.entries()) {
    updateLevelState(lvl);
  }
}

function updateWorldGoalState(goal: WorldGoal) {
  goal.htmlImageSubstitute.classList.remove("hasSubstitute");
  goal.htmlImageLenseNeeded.classList.remove("isNeeded");
  goal.htmlImageBeatableWithHarderDifficulty.classList.remove("show");
  let imgPath = "images/states/";
  if(goal.completed.get()) {
	goal.htmlImage.src = imgPath + goal.goalType + ".png";
	goal.htmlImage.classList.toggle("completed", true);
	goal.htmlImage.classList.toggle("blocked", false);
  } else if(goal.level.locked.get()) {
	goal.htmlImage.src = imgPath + goal.goalType + "_unchecked.png";
	goal.htmlImage.classList.toggle("completed", false);
	goal.htmlImage.classList.toggle("blocked", true);  
  } else if(goal.level.isBowserLevel() &&
      (state.bossesCompleted.get() < <number>state.gameOptions.get(GameOptions.BowserCastleEnter) ||
	  (state.bossesCompleted.get() < <number>state.gameOptions.get(GameOptions.BowserCastleClear) && goal.goalType === WorldGoalTypes.LevelClear))) 
  {
	goal.htmlImage.src = imgPath + goal.goalType + "_unchecked.png";
	goal.htmlImage.classList.toggle("completed", false);
	goal.htmlImage.classList.toggle("blocked", true);  
  } else {
	goal.htmlImage.src = imgPath + goal.goalType + "_unchecked.png";
    
	let isBeatable = goal.evaluateRules({
	  collectables: new Map<CollectableTypes, boolean|number>(Array.from(state.collectables).map(([key, collectable])=>[key, collectable.value.get()])),
	  difficulty: <number>state.gameOptions.get(GameOptions.Difficulty),
	  consumableEgg: false,
	  consumableWatermelon: false,
	  canSeeClouds: true
	});
	let blocked = !isBeatable;
	let canBeSubstitutedByConsumable = false;
	if(blocked) {
	  canBeSubstitutedByConsumable = checkForConsumable(goal, CollectableTypes.Egg, <number>state.gameOptions.get(GameOptions.Difficulty));
	  blocked = !canBeSubstitutedByConsumable;
	}
	if(blocked) {
	  canBeSubstitutedByConsumable = checkForConsumable(goal, CollectableTypes.Watermelon, <number>state.gameOptions.get(GameOptions.Difficulty));
	  blocked = !canBeSubstitutedByConsumable;
	}
	goal.htmlImage.classList.toggle("completed", false);
	goal.htmlImage.classList.toggle("blocked", blocked);
	if(!blocked&&<number>state.gameOptions.get(GameOptions.Difficulty)==0) {
	  goal.htmlImageLenseNeeded.classList.toggle("isNeeded",!goal.evaluateRules({
		  collectables: new Map<CollectableTypes, boolean|number>(Array.from(state.collectables).map(([key, collectable])=>[key, collectable.value.get()])),
		  difficulty: <number>state.gameOptions.get(GameOptions.Difficulty),
		  consumableEgg: true,
		  consumableWatermelon: true,
		  canSeeClouds: false
		}));
	}
	if(<number>state.gameOptions.get(GameOptions.HarderDifficulty)><number>state.gameOptions.get(GameOptions.Difficulty)&&!isBeatable) {
	  isBeatable = goal.evaluateRules({
		collectables: new Map<CollectableTypes, boolean|number>(Array.from(state.collectables).map(([key, collectable])=>[key, collectable.value.get()])),
		difficulty: <number>state.gameOptions.get(GameOptions.HarderDifficulty),
		consumableEgg: false,
		consumableWatermelon: false,
		canSeeClouds: true
	  });
	  let blocked = !isBeatable;
	  if(!isBeatable&&!canBeSubstitutedByConsumable) {
	    canBeSubstitutedByConsumable = checkForConsumable(goal, CollectableTypes.Egg, <number>state.gameOptions.get(GameOptions.HarderDifficulty));
	    blocked = !canBeSubstitutedByConsumable;
	  }
	  if(!isBeatable&&!canBeSubstitutedByConsumable) {
	    canBeSubstitutedByConsumable = checkForConsumable(goal, CollectableTypes.Watermelon, <number>state.gameOptions.get(GameOptions.HarderDifficulty));
	    blocked = !canBeSubstitutedByConsumable;
	  }
	  goal.htmlImageBeatableWithHarderDifficulty.classList.toggle("show", !blocked);
	}
  }
  updateLevelState(goal.level);
}

function performOnAllCollectables(func: (collectable: Collectable) => void) {
  for(let c of state.collectables.values()) {
    func(c);
  }
}

function initTrackerHTML() : void {
  setupCollectablesInHTML();
  setupWorldsInHTML();
  setupMenuInHTML();
  setupBossChoiceContextMenu();
  resetLogicInfobox();
  autotracker = createAutotracker();
  autotracker.addConnectionStatusListener(updateSniConnectionStatus);
  autotracker.addLevelOrderChangeListener(orderWorldLevel);
  onPortChanged();
}

function setupMenuInHTML() : void {
  let difficultyDropdown = <HTMLSelectElement>document.getElementById("difficulty_dropdown");
  for(var i:number = 0; i< difficultyNames.length; i++) {
    difficultyDropdown.appendChild(Object.assign(document.createElement("option"), { value: i, textContent: difficultyNames[i] }));
  }
  difficultyDropdown.value = state.gameOptions.get(GameOptions.Difficulty).toString();
  
  setupHarderDifficultyDropDown();
  
  let levelListElement = <HTMLElement>document.getElementById("levelList");
  for(let [id,name] of levelNames.entries()) {
    levelListElement.appendChild(Object.assign(document.createElement("option"), { value: name }));
  }
  doSearchLevel();
  
  state.gameOptions.addChangeListener((optionType, value) => notifyGameOptionChanged(optionType, value));
  copyGameOptions2State();
  
  state.luigiPieces.addChangeListener((value) => notifyLuigiPiecesChanged(value));
  notifyLuigiPiecesChanged(state.luigiPieces.get());
  state.checksCompleted.addChangeListener((value)=> {
    let locState = state;
	notifyChecksCountChanged(value, locState.checksTotal.get());
  });
  state.checksTotal.addChangeListener((value)=> {
    let locState = state;
	notifyChecksCountChanged(state.checksCompleted.get(), value);
  });
  notifyChecksCountChanged(state.checksCompleted.get(), state.checksTotal.get());
  state.bossesCompleted.addChangeListener((value)=> {
    let locState = state;
	notifyBossCountChanged(value, locState.bossesTotal.get());
  });
  state.bossesTotal.addChangeListener((value)=> {
    let locState = state;
	notifyBossCountChanged(state.bossesCompleted.get(), value);
  });
  notifyBossCountChanged(state.bossesCompleted.get(), state.bossesTotal.get());
  
  (<HTMLInputElement>document.getElementById("chkSpoilerBosses")).checked = false;
}
function setupHarderDifficultyDropDown(): void {
  let harderDifficultyDropdown = <HTMLSelectElement>document.getElementById("harder_difficulty_dropdown");
  harderDifficultyDropdown.textContent="";
  harderDifficultyDropdown.appendChild(Object.assign(document.createElement("option"), { value: 0, textContent: "-" }));
  for(var i:number = <number>state.gameOptions.get(GameOptions.Difficulty)+1; i< difficultyNames.length; i++) {
    harderDifficultyDropdown.appendChild(Object.assign(document.createElement("option"), { value: i, textContent: difficultyNames[i] }));
  }
  if(<number>state.gameOptions.get(GameOptions.HarderDifficulty)<=<number>state.gameOptions.get(GameOptions.Difficulty)) {
    harderDifficultyDropdown.value = "0";
  } else {
    harderDifficultyDropdown.value = state.gameOptions.get(GameOptions.HarderDifficulty).toString();
  }
  if(!harderDifficultyDropdown.value) {
    harderDifficultyDropdown.value = difficultyGlitched.toString();
  }
}
function copyGameOptions2State(): void {
  document.querySelectorAll("[gameOption]").forEach((element)=> {
	onInputElementChanged(element);
  });
}
function setupCollectablesInHTML() : void {
  let trackerNode = document.getElementById("trackingoverlay");
  let rowElement : HTMLDivElement;
  trackerNode.textContent = '';
  for (let i=0; i<collectableList.length; i++) {
    let collectable : Collectable = state.collectables.get(collectableList[i]);
	if ((i%collectablesPerRow)===0) {
	  rowElement = Object.assign(document.createElement("div"), {
	    className: "row"
	  });
	  trackerNode.appendChild(rowElement);
	}
	let cellElement = Object.assign(document.createElement("div"), {
	  className: "cell collectable"
    });
	
	collectable.htmlImage = Object.assign(document.createElement("img"), {
	  src: getCollectableImageURL(collectable),
	  id:  "collectable-"+i,
      className: "collectable",	  
	  width: 64,
	  height: 64,
	  onclick: (e:Event) => toggleCollectable(collectable),
      draggable: true,
	  dropzone: "move string:text/html",
      ondragstart: (e:DragEvent)=> dragStartCollectable(e, collectable.collectableType),
      ondragover: (e:DragEvent)=> e.preventDefault(),
      ondrop: (e:DragEvent)=> dropCollectable(e, collectable.collectableType),
	  textContent: collectableList[i]
	});
	collectable.htmlImageSubstitute = Object.assign(document.createElement("img"), {
	  src: "",
	  id:  "collectable-substitute-"+i,
      className: "collectable-substitute",	  
	  width: 24,
	  height: 24
	});
	collectable.value.addChangeListener((value)=>updateCollectable(collectable));
	cellElement.append(collectable.htmlImage,collectable.htmlImageSubstitute);
	rowElement.appendChild(cellElement);
  }
}
function setupBossChoiceContextMenu() {
  let mainElement = <HTMLElement>document.getElementById("app");
  let allBosses = 
    [BossTypes.Boss14, BossTypes.Boss18
	,BossTypes.Boss24, BossTypes.Boss28
	,BossTypes.Boss34, BossTypes.Boss38
	,BossTypes.Boss44, BossTypes.Boss48
	,BossTypes.Boss54, BossTypes.Boss58
	,BossTypes.Boss64, BossTypes.Unknown];
  let contextMenu = Object.assign(document.createElement("div"), {
	  className: "context-menu",
	  id: "context-menu-boss"
  });
  let cancelElement: HTMLImageElement = Object.assign(document.createElement("img"), {
	  src: "images/cancel.png",
	  className: "context-menu-cancel-icon",
	  id: "context-menu-boss-cancel",
	  onclick: (e:Event)=>hideContextMenu()
	});
  contextMenu.appendChild(cancelElement);
  let rowElement: HTMLElement;
  for(let i=0; i<allBosses.length; i++) {
    if(i%4==0) {
	  rowElement = Object.assign(document.createElement("div"), {
	      className: "context-menu-boss-row",
		  id: "context-menu-boss-row-"
	    });
	  contextMenu.appendChild(rowElement);
	}
	let bossElement: HTMLImageElement = Object.assign(document.createElement("img"), {
	  src: "images/worlds/" + allBosses[i] + ".png",
	  className: "context-menu-boss-icon",
	  id: "context-menu-boss-entry-"+i,
	  onclick: (e:Event)=>assignBoss2Level(allBosses[i])
	});
	rowElement.appendChild(bossElement);
  }
  mainElement.appendChild(contextMenu);
}
function setupWorldsInHTML() : void {
  let worldNode = document.getElementById("worldoverlay");
  worldNode.textContent = '';
  let w = 0;
  let rowElement: HTMLDivElement;
  for(let [worldId, world] of state.worldLevels.entries()) {
      if(w!=world.world) {
	    w = world.world;
	    rowElement = Object.assign(document.createElement("div"), {
	      className: "row world world-"+world.world,
		  id: "world-"+world.world
	    });
		notifyWorldIsOpenChanged(rowElement, world.world, state.worldOpen.get(world.world));
		worldNode.appendChild(rowElement);
		let rowCollider = Object.assign(document.createElement("img"), {
		  className: "worldCollider",
		  onclick: (e:Event) => toggleWorldOpenState(world.world)
		});
		let rowLabel = Object.assign(document.createElement("div"), {
		  textContent: "World - "+world.world,
		  className: "worldLabel"
		});
		rowElement.append(rowCollider, rowLabel);
      }
	    // Worlds
		let worldLabeledIcon = Object.assign(document.createElement("figure"), {
		  className: "worldIcon level-"+world.level,
		  id: worldId
		});
		world.htmlElement = worldLabeledIcon;
		if (world.level>=9) {
		  let worldLockToggle = Object.assign(document.createElement("img"), {
		    id: "world-lock-toggle-"+worldId,
		    className: "worldLockToggle"+(world.locked.get()?" isLocked":""),
		    onclick: (e:Event) => world.toggleLocked()
		  });
		  if(world.level==9) {
			  world.locked.addChangeListener((value)=>{
				worldLockToggle.classList.toggle("isLocked", value);
				updateLevelGoals(world);
			  });
		  } else {
			  world.locked.addChangeListener((value)=>{
				worldLockToggle.classList.toggle("isLocked", value);
				updateLevelState(world);
			  });
		  }
		  worldLabeledIcon.appendChild(worldLockToggle);
		}
		let worldLabel = Object.assign(document.createElement("a"), {
		  href: "https://www.mariouniverse.com/wp-content/img/maps/snes/yi/"+world.world+"-"+(world.level<9?world.level:"ex")+".png",
		  className: "worldLabel",
		  target: "_blank",
		  textContent: worldId,
		  title: "Open Map from MarioUniverse.com"
		});
		let worldImage = Object.assign(document.createElement("img"), {
		  src: "images/worlds/" + worldId + ".png",
		  id: "world-"+worldId,
		  className: "worldIconImage",
		  title: world.name,
		  width: 48,
		  height: 48,
		  onclick: (e:Event) => toggleAllWorldGoalCompleted(world),
          ondragstart: (e:DragEvent)=> dragStartWorldLevel(e, world),
          ondragover: (e:DragEvent)=> e.preventDefault(),
          ondrop: (e:DragEvent)=> dropWorldLevel(e, world)
		});
		world.htmlImage = worldImage;
		let worldImageFinish = Object.assign(document.createElement("img"), {
		  id: "world-"+worldId+"-finish",
		  className: "worldFinishedImage",
		  width: 54,
		  onclick: (e:Event) => toggleAllWorldGoalCompleted(world),
          ondragstart: (e:DragEvent)=> dragStartWorldLevel(e, world),
          ondragover: (e:DragEvent)=> e.preventDefault(),
          ondrop: (e:DragEvent)=> dropWorldLevel(e, world)
		});
		if(world.isBossLevel()) {
		  worldLabeledIcon.classList.add("castle");
		  worldImage.classList.add("castle");
          if(!world.isBowserLevel()) {
		    worldImage = Object.assign(worldImage, {
			  oncontextmenu: (e:Event)=> {
			    showContextMenu(world);
				e.preventDefault();
			  }
			});
		  }
		}
		worldLabeledIcon.append(worldImage,worldLabel,worldImageFinish);
	    rowElement.appendChild(worldLabeledIcon);
		
		// Goals
		if (world.level<10 ) {
			let goalsCol = Object.assign(document.createElement("div"), {
			  className: "worldGoals col level-"+world.level
			});
			world.htmlGoals = goalsCol;
			for(let [goalId, goal] of world.goals.entries()) {
			  let goalsCell = Object.assign(document.createElement("div"), {
				className: "worldGoals row goalType-"+goal.goalType.replaceAll(" ", "-"),
				onmouseover: (e:Event) => onMouseOverGoal(goal),
				onmouseout: (e:Event) => onMouseOutGoal()
			  });
			  goal.htmlImage = Object.assign(document.createElement("img"), {
				id: goal.getId(),
				className: "worldGoals image",
				width: 16,
				onclick: (e:Event) => toggleWorldGoalCompleted(goal)
			  });
			  goal.htmlImageSubstitute = Object.assign(document.createElement("img"), {
				id:  goal.getId()+"-substitute",
				className: "worldgoal-substitute",	  
				width: 10,
				height: 10,
				onclick: (e:Event) => toggleWorldGoalCompleted(goal)
			  });
			  goal.htmlImageLenseNeeded = Object.assign(document.createElement("img"), {
				src: "images/collectables/Magic Lense.png",
				id:  goal.getId()+"-lenseNeeded",
				className: "worldgoal-lenseNeeded",	  
				width: 10,
				height: 10,
				onclick: (e:Event) => toggleWorldGoalCompleted(goal),
			  });
			  goal.htmlImageBeatableWithHarderDifficulty = Object.assign(document.createElement("img"), {
				src: "images/collectables/Hard Mode.png",
				id:  goal.getId()+"-hardMode",
				className: "worldgoal-hardMode",	  
				width: 8,
				height: 8,
				onclick: (e:Event) => toggleWorldGoalCompleted(goal)
			  });
			  goal.completed.addChangeListener((value)=> updateWorldGoalState(goal));
			  updateWorldGoalState(goal);
			  goalsCell.append(goal.htmlImage, goal.htmlImageSubstitute,goal.htmlImageLenseNeeded,goal.htmlImageBeatableWithHarderDifficulty);
			  goalsCol.appendChild(goalsCell);
			}
	        rowElement.appendChild(goalsCol);
			world.boss.addChangeListener((value)=>notifyWorldLevelBossChanged(world));
			notifyWorldLevelBossChanged(world, false);
		} else {
		    updateLevelState(world);
			for(let [goalId, goal] of world.goals.entries()) {
			  goal.completed.addChangeListener((value)=> updateLevelState(goal.level));
			}
		}
  }
  state.worldOpen.addChangeListener((world, isOpen)=> notifyWorldIsOpenChanged(null, world, isOpen));
}
function toggleCollectable(collectable: Collectable) : void {
    collectable.toggle();
	updateCollectable(collectable);
}
function updateCollectable(collectable: Collectable) : void {
	collectable.htmlImage.setAttribute("src", getCollectableImageURL(collectable));
	updateAllWorldGoals();
}

function toggleWorldGoalCompleted(goal: WorldGoal) : void {
  goal.completed.set(!goal.completed.get());
}
function toggleAllWorldGoalCompleted(worldLevel: WorldLevel) : void {
  worldLevel.toggleGoalsCompleted();
}
function dragStartCollectable(event: DragEvent, collectable: CollectableTypes) {
  event.dataTransfer.setData("text/plain", collectable);
  event.dataTransfer.effectAllowed = "move";
}
function dropCollectable(event: DragEvent, collectable: CollectableTypes) {
  let startPos = collectableList.indexOf(<CollectableTypes>event.dataTransfer.getData("text/plain"));
  let endPos = collectableList.indexOf(collectable);
  if(startPos>=0 && endPos != startPos) {
	  moveElement(collectableList, startPos, endPos);
      saveOrderToLocalStorage(collectableList, collectableListStorage);
      setupCollectablesInHTML();
  }
}
function swapHTMLElements(obj1: HTMLElement, obj2: HTMLElement): void {
    let temp:HTMLElement = document.createElement("div");
    obj1.parentNode.insertBefore(temp, obj1);
    obj2.parentNode.insertBefore(obj1, obj2);
    temp.parentNode.insertBefore(obj2, temp);
    temp.parentNode.removeChild(temp);
}
function swapLevels(obj1: WorldLevel, obj2: WorldLevel): void {
  if(obj1 && obj2 && obj1 != obj2) {
	  swapHTMLElements(obj1.htmlElement, obj2.htmlElement);
	  swapHTMLElements(obj1.htmlGoals, obj2.htmlGoals);
  }
}
function dragStartWorldLevel(event: DragEvent, worldlevel: WorldLevel) {
  if(worldlevel.level > 8)
    return;
  event.dataTransfer.setData("text/plain", worldlevel.getId());
  event.dataTransfer.effectAllowed = "move";
}
function dropWorldLevel(event: DragEvent, worldlevelEnd: WorldLevel) {
  if(worldlevelEnd.level > 8)
    return;
  let worldlevelStart = state.worldLevels.get(event.dataTransfer.getData("text/plain"));
  swapLevels(worldlevelStart,worldlevelEnd);
}
function orderWorldLevel(levelOrder: string[]): void {
  let index : number = 0;
  for(let w: number = 1; w <= 6; w++) {
    let htmlWorldElement = document.getElementById("world-"+w);
    for(let i: number = 0; i<htmlWorldElement.children.length; i++) {
	  let curElement = htmlWorldElement.children[i];
	  if(/\d-\d/g.test(curElement.id)) {
	    let levelStart = state.worldLevels.get(curElement.id);
	    let levelEnd = state.worldLevels.get(levelOrder[index]);
        if(levelStart?.level <= 8) {
		  if(levelEnd?.level <= 8)
		    swapLevels(levelStart, levelEnd);
		  index++;
		}
		if(index>= levelOrder.length) {
          doSearchLevel();
		  return;
		}
	  }
	}
  }
  doSearchLevel();
}

function setGoalRequirementsHighlights(goal: WorldGoal) : void {
  const nullText = "No items needed.";
  let displayText = "";
  let combinedFuncText = "";
  for(let [key, funcString] of goal.getRulesAsStrings({
	  collectables: new Map<CollectableTypes, boolean|number>(Array.from(state.collectables).map(([key, collectable])=>[key, collectable.value.get()])),
	  difficulty: <number>state.gameOptions.get(GameOptions.Difficulty),
	  consumableEgg: false,
	  consumableWatermelon: false,
	  canSeeClouds: true
	}).entries()) 
  {
    if(key&&key.length>0)
	  displayText += key+":\r\n";
	if(funcString&&funcString.length) {
	  combinedFuncText+=" && "+funcString;
	  funcString = funcString.replaceAll(/,\s*consumable(Egg|Watermelon)\s*/g,"");
      displayText += "   "+(funcString=="true"?nullText:funcString)+"\r\n";
	} else {
      displayText += "   "+nullText+"\r\n";
	}
  }
  displayText = displayText.replaceAll("()", "("+nullText+")");
  setInfoBoxText(displayText);
  if(/has(Eggs)?\s*\(/g.test(combinedFuncText)) {
    isGoalRequirementsHighlighted = true;
  
    performOnAllCollectables(collectable=> {
	    let isNeeded: boolean;
		let isCollected: boolean;
		if(collectable.collectableType === CollectableTypes.Egg) {
		  isNeeded = combinedFuncText.indexOf("hasEggs(") >= 0;
		  isCollected = true;
		  let matches = combinedFuncText.matchAll(/.*hasEggs\(\s*(\d+)\s*(\)|,).*/g);
		  for(let match of matches) {
		    if(parseInt(match[1]) > <number>collectable.value.get()) {
			  isCollected = false;
			  break;
			}
		  }
		} else {
		  isNeeded = combinedFuncText.indexOf("\""+collectable.collectableType+"\"") > 0;
		  isCollected = <boolean>collectable.value.get();
		}
		if(isNeeded&&!isCollected) {
		  let consumableParse = combinedFuncText.match((collectable.collectableType === CollectableTypes.Egg?".*hasEggs\\(\\s*\\d+":".*\""+collectable.collectableType+"\"")+"\\s*,\\s*consumable(Egg|Watermelon).*");
		  if(consumableParse) {
		    collectable.htmlImageSubstitute.src = "images/collectables/" + consumableParse[1] + "_substitute.png";
			collectable.htmlImageSubstitute.classList.add("hasSubstitute");
		  }
		}
        collectable.htmlImage.classList.toggle("isNeeded", isNeeded);
        collectable.htmlImage.classList.toggle("isCollected", isCollected);
        collectable.htmlImage.classList.toggle("hasSubstitute", isNeeded&&!isCollected&&goal.evaluateRules(
		    //Evaluate rule with all items set to max but the one beeing testet remaining at current state
		    {collectables: new Map<CollectableTypes, boolean|number>(Array.from(state.collectables).map((
				[key, c])=>[key, key==collectable.collectableType?c.value.get():c.maxValue?c.maxValue:true])),
			  difficulty: <number>state.gameOptions.get(GameOptions.Difficulty),
			  consumableEgg: false,
			  consumableWatermelon: false,
			  canSeeClouds: true
			}));
	});
  }
  if(goal.level.isBowserLevel()) {
	let displaySummaryBosses: HTMLElement = document.getElementById("summaryBosses");
      (state.bossesCompleted.get() >= <number>state.gameOptions.get(GameOptions.BowserCastleEnter) &&
	  (state.bossesCompleted.get() >= <number>state.gameOptions.get(GameOptions.BowserCastleClear) || goal.goalType !== WorldGoalTypes.LevelClear));
	displaySummaryBosses.classList.toggle("isNeeded", true);
    displaySummaryBosses.classList.toggle("isCollected", 
      (state.bossesCompleted.get() >= <number>state.gameOptions.get(GameOptions.BowserCastleEnter) &&
	  (state.bossesCompleted.get() >= <number>state.gameOptions.get(GameOptions.BowserCastleClear) || goal.goalType !== WorldGoalTypes.LevelClear)));
  }
}
function setInfoBoxText(s: string) {
  let infoBox = document.getElementById("infooverlay");
  if(infoBox)
    infoBox.textContent = s;
}
function resetLogicInfobox() {
	 setInfoBoxText("<Hover mouse over goal (e.g. world 5-3 red coin) to see what's logically needed to achieve that goal.>");
}

var hoverTimeoutId = 0;
var hoveroutTimeoutId = 0;
function onMouseOverGoal(goal: WorldGoal) : void {
   if(hoverTimeoutId>0) {
     clearTimeout(hoveroutTimeoutId);
   }
   hoverTimeoutId = setTimeout(() => setGoalRequirementsHighlights(goal), 600);
}
function clearGoalRequirementsHighlights() {
  if(isGoalRequirementsHighlighted) {
     performOnAllCollectables(collectable=>{	 
	   collectable.htmlImage.classList.remove("isNeeded","hasSubstitute","isCollected");
	   collectable.htmlImageSubstitute.classList.remove("hasSubstitute");
	 });
	 let displaySummaryBosses: HTMLElement = document.getElementById("summaryBosses");
	 displaySummaryBosses.classList.toggle("isNeeded", false);
	 displaySummaryBosses.classList.toggle("isCollected", false);
	 isGoalRequirementsHighlighted = false; 
	 resetLogicInfobox();
  }
}
function onMouseOutGoal() : void {
   if(hoverTimeoutId>0) {
     clearTimeout(hoverTimeoutId);
   }
   hoveroutTimeoutId = setTimeout(() => clearGoalRequirementsHighlights(), 50);
}

function updateAllWorldGoals() : void {
  for(let [id, goal] of state.worldGoals) {
    if(goal.level.level==10)
	  updateLevelState(goal.level);
	else
      updateWorldGoalState(goal);
  }
}

function updateSniConnectionStatus(message: string):void {
  let statusElement = document.getElementById("connectionStatus");
  if(statusElement) {
    statusElement.textContent = message;
  }
}

function onPortChanged(): void {
  let textAutotrackerPort = <HTMLInputElement>document.getElementById("inputPort");
  autotracker.setPort(parseInt(textAutotrackerPort.value));
}

function notifyWorldIsOpenChanged(element: HTMLElement, world: number, isOpen:boolean) {
  let worldElement = element?element:document.getElementById("world-"+world);
  if(worldElement.id==="world-"+world) {
	worldElement.classList.toggle("isOpen", isOpen);
	worldElement.classList.toggle("isNotOpen", !isOpen);
  }
}

function toggleWorldOpenState(world:number) {
  state.toggleWorldOpen(world);
}
function capitalizeString(s:string):string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function doSearchLevel() {
  let inputField = <HTMLInputElement>document.getElementById("inputLevelSearch");
  let resultField = <HTMLElement>document.getElementById("levelSearchResult");
  let result: string = "";
  if(inputField.value && inputField.value.length>0)
  for(let [id,name] of levelNames.entries()) {
    if(name.toLowerCase().startsWith(inputField.value.toLowerCase())) {
	  result = "> "+id;
	  let level = state.worldLevels.get(id);
	  if("world-"+level.world!==level.htmlElement.parentElement.id) {
		result += " ("+capitalizeString(level.htmlElement.parentElement.id)+")";
	  }
	}
  }
  resultField.textContent = result;
}

function onInputElementChanged(element: Element) {
  let gameOption = <GameOptions>element.getAttribute("gameOption");
  if(gameOption) {
    if(element instanceof HTMLInputElement) {
	  if(element.getAttribute("type")==="checkbox") {
	    state.gameOptions.set(gameOption, <boolean>element.checked);
	  } else if(element.getAttribute("type")==="number") {
	    state.gameOptions.set(gameOption, parseInt(element.value));
	  } else if(element.getAttribute("type")==="radio") {
	    if(element.checked)
	      state.gameOptions.set(gameOption, element.value);
	  } else {
	    state.gameOptions.set(gameOption, element.value);
	  }
	} else if(element instanceof HTMLSelectElement) {
	    if(element.getAttribute("type")==="number") {
	      state.gameOptions.set(gameOption, parseInt(element.value));
		} else {
	      state.gameOptions.set(gameOption, element.value);
		}
	}
  }
}

function updateUiElements(optionType: GameOptions, value: string|number|boolean) {
  document.querySelectorAll("[gameOption='"+optionType+"']").forEach((element)=>{
    if(element instanceof HTMLInputElement) {
	  if(element.getAttribute("type")==="checkbox") {
	    if(element.checked != <boolean>value)
	      element.checked = <boolean>value;
	  } else if(element.getAttribute("type")==="radio") {
	    if(!element.checked && element.value === value.toString())
	      element.checked = true;
	  } else if (element.value != value.toString()) {
	    element.value = value.toString();
	  }
	} else if(element instanceof HTMLSelectElement && element.value != value.toString()) {
	  element.value = value.toString();
	}
  });
}

function notifyGameOptionChanged(optionType: GameOptions, value: string|number|boolean) {
  let mainElement = <HTMLElement>document.getElementById("app");
  updateUiElements(optionType, value);
  if(GameOptions.MinigameBonus === optionType||GameOptions.MinigameBandit=== optionType||GameOptions.ExtraLevel === optionType) {
	mainElement.classList.toggle(optionType.replace(" ","-"), <boolean>value);
	updateAllLevelState();
  } else if(GameOptions.LuigiPiecesRequired === optionType||GameOptions.BowserCastleEnter === optionType||GameOptions.BowserCastleClear === optionType) {
	if(GameOptions.LuigiPiecesRequired === optionType) {
	  let displaySummary = <HTMLElement>document.getElementById("dspLuigiPiecesRequired");
	  if(displaySummary)
	    displaySummary.textContent=" / "+value;
	} 
  } else if(GameOptions.Goal === optionType) {
      let goalBowser = value === "0";
	  mainElement.classList.toggle("goal-Bowser", goalBowser);
	  mainElement.classList.toggle("goal-Luigi-Pieces", !goalBowser);
	  if(!goalBowser)
	    state.gameOptions.set(GameOptions.BowserCastleClear, 255);
	  let bowserClearElement = <HTMLInputElement>document.querySelector("[gameOption='"+GameOptions.BowserCastleClear+"']");
	  bowserClearElement.disabled = !goalBowser;
  } else if(GameOptions.BowserCastleRoute === optionType) {
      updateBowserCastleGoals();
  } else if(GameOptions.BossShuffle === optionType||GameOptions.LevelShuffle === optionType) {
	mainElement.classList.toggle(optionType.replace(" ","-"), <boolean>value);
  } else if(GameOptions.Difficulty === optionType) {
    window.localStorage.setItem(difficultyStorage,value.toString());
    updateAllWorldGoals();
    setupHarderDifficultyDropDown();
  } else if(GameOptions.HarderDifficulty === optionType) {
    window.localStorage.setItem(showHardModeStorage,value.toString());
    updateAllWorldGoals();
  } else {
    console.log(optionType+" => "+value);
  }
}

function onLuigiPiecesChanged(element: HTMLInputElement) {
  state.luigiPieces.set(parseInt(element.value));
}

function notifyLuigiPiecesChanged(value: number) {
  let textField: HTMLInputElement = <HTMLInputElement>document.getElementById("inputLuigiPieces");
  if(textField)
    textField.value = value.toString();
}

function updateBowserCastleGoals() {
	updateLevelGoals(state.worldLevels.get("6-8"));
}

function updateLevelGoals(level: WorldLevel) {
  for (let [goalId, goal] of level.goals.entries()) {
	updateWorldGoalState(goal);
  }
}

function notifyChecksCountChanged(checksCompleted: number, checksTotal: number): void {
	let displaySummaryChecks = document.getElementById("summaryChecks");
	displaySummaryChecks.textContent = checksCompleted + " / " + checksTotal;
}

function notifyBossCountChanged(bossesCompleted: number, bossesTotal: number): void {
	let displaySummaryBosses = document.getElementById("summaryBosses");
	displaySummaryBosses.textContent = bossesCompleted + " / " + bossesTotal;
	updateBowserCastleGoals();
}

function toggleOptionMenu() {
  let mainElement = <HTMLElement>document.getElementById("optionPanel");
  mainElement.classList.toggle("HideOptions");
}
let contextMenu4Level: WorldLevel;

function showContextMenu(level: WorldLevel) {
  contextMenu4Level = level;
  let contextMenu: HTMLElement = document.getElementById("context-menu-boss");
  let elementRect = level.htmlElement.getBoundingClientRect();
  contextMenu.style.top = (elementRect.top-8)+"px";
  contextMenu.style.left = (elementRect.right+2)+"px";
  contextMenu.classList.toggle("active", true);
}

function hideContextMenu() {
  let contextMenu: HTMLElement = document.getElementById("context-menu-boss");
  contextMenu.classList.toggle("active", false);
}

function notifyWorldLevelBossChanged(world: WorldLevel, updateGoals: boolean=true) {
  if(world.boss.get()&&!world.isBowserLevel()) {
	  world.htmlImage = Object.assign(world.htmlImage, {
		src: "images/worlds/"+world.boss.get().id+".png"
	  });
	if(updateGoals)
	  updateAllWorldGoals();
  }
}
function assignBoss2Level(bossType: BossTypes) {
  contextMenu4Level?.setBossByType(bossType);
  hideContextMenu();
}
function onSpoilerBossesChanged(checkBox: HTMLInputElement): void {
  optionSpoilerBosses = checkBox.checked; 
  autotracker?.clearLastRecieved();
}