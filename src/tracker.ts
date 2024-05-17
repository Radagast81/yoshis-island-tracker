import { WorldGoalTypes, BossTypes, BowserCastleRouteTypes, CollectableTypes, EvaluationState } from "./model/types";

declare global {
    interface Window { 
	  optionBowserCastleRoute: BowserCastleRouteTypes;
	}
}
abstract class WorldLevel {
  readonly world: number;
  readonly level: number;
  readonly name: string;
  boss : Boss;
  goals: WorldGoal[];
  abstract getId() : string;
  abstract isBossLevel() : boolean;
  abstract isBowserLevel() : boolean;
  abstract toggleGoalsCompleted() : void;
  abstract switchBossWithLevel(other: WorldLevel): void;
  abstract addLockChangeListener(listener: {(level: WorldLevel): void }): number;
  abstract isLocked() : boolean;
  abstract toggleLocked(): void;
  
  htmlElement: HTMLElement;
}
abstract class WorldGoal {
  // included from logic.ts:
  readonly goalType: WorldGoalTypes;
  readonly level: WorldLevel;
  abstract getId() : string;
  abstract isCompleted() : boolean;
  abstract setCompleted(completed: boolean): void;
  abstract getRulesAsStrings(evalState: EvaluationState): Map<string, string>;
  abstract evaluateRules(evalState: EvaluationState) : boolean;
  abstract addDataChangeListener(listener: {(goal: WorldGoal): void }): number;
  
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
  readonly minValue? : number;
  readonly maxValue? : number;
  
  abstract toggle() : void;
  abstract getValue(): boolean|number;
  abstract addDataChangeListener(listener: {(collectable: Collectable): void }): number;
  
  // addtional layout information:
  htmlImage: HTMLImageElement;
  htmlImageSubstitute: HTMLImageElement;
}
abstract class State {
  readonly worldLevels: Map<string, WorldLevel>;
  readonly worldGoals: Map<string, WorldGoal>;
  readonly collectables: Map<CollectableTypes, Collectable>;
  readonly worldOpen: Map<number, boolean>;
  abstract getGoal(world: number, level: number, goaltype: WorldGoalTypes) : WorldGoal;
  abstract addWorldOpenChangeListener(listener: {(world: number, isOpen: boolean): void }): number;
  abstract toggleWorldOpen(world:number):void;
}
abstract class Autotracker {
  abstract addConnectionStatusListener(listener: {(connectionStatus: string): void }): number;
  abstract setPort(port: number): void;
}

var state : State;
var levelNames: Map<string, string>;

function getWorldGoalId(world:number, level: number, goaltype: WorldGoalTypes) : string {
  return state.getGoal(world, level, goaltype).getId();
}
var collectablesPerRow = 10;
var collectableList = Array.from(state.collectables.keys());
var collectableListStorage = "YoshisIslandTrackerCollectableOrder";
var difficultyStorage = "YoshisIslandTrackerDifficulty";
var bowserCastleRouteStorage = "YoshisIslandTrackerBowserCastleRoute";
var showHardModeStorage = "YoshisIslandTrackerShowHardMode";
var optionDifficulty: number;
var optionShowHardMode: boolean;
var createAutotracker: {(): Autotracker };
var autotracker: Autotracker;
{ 
    collectableList = loadOrderFromLocalStorage(collectableList, collectableListStorage);
	if(!window.localStorage.getItem(difficultyStorage))
	  window.localStorage.setItem(difficultyStorage, "1");
	optionDifficulty = parseInt(window.localStorage.getItem(difficultyStorage));
	if(!window.localStorage.getItem(bowserCastleRouteStorage))
	  window.localStorage.setItem(bowserCastleRouteStorage, BowserCastleRouteTypes.DoorSelect);
	window.optionBowserCastleRoute = <BowserCastleRouteTypes>window.localStorage.getItem(bowserCastleRouteStorage);
	optionShowHardMode = window.localStorage.getItem(showHardModeStorage) === "true";
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
	let value : number|boolean = collectable.getValue();
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
	  collectables: new Map<CollectableTypes, boolean|number>(Array.from(state.collectables).map(([key, collectable])=>[key, collectable.getValue()])),
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
  for(let goal of level.goals) {
    if(!goal.isCompleted()) {
	  isLevelFinished = false;
	  if(goal.htmlImage&&!goal.htmlImage.classList.contains("blocked"))
	    isGoalOpen = true;
	}
  }
  level.htmlElement.classList.toggle("isFinished", isLevelFinished);
  level.htmlElement.classList.toggle("isLocked", level.isLocked());
  level.htmlElement.classList.toggle("noOpenGoals", !isLevelFinished&&!isGoalOpen);
}

function updateWorldGoalState(goal: WorldGoal) {
  goal.htmlImageSubstitute.classList.remove("hasSubstitute");
  goal.htmlImageLenseNeeded.classList.remove("isNeeded");
  goal.htmlImageBeatableWithHarderDifficulty.classList.remove("show");
  let imgPath = "images/states/";
  if(goal.isCompleted()) {
	goal.htmlImage.src = imgPath + goal.goalType + ".png";
	goal.htmlImage.classList.toggle("completed", true);
	goal.htmlImage.classList.toggle("blocked", false);
  } else if(goal.level.isLocked()) {
	goal.htmlImage.src = imgPath + goal.goalType + "_unchecked.png";
	goal.htmlImage.classList.toggle("completed", false);
	goal.htmlImage.classList.toggle("blocked", true);  
  } else {
	goal.htmlImage.src = imgPath + goal.goalType + "_unchecked.png";
    
	let isBeatable = goal.evaluateRules({
	  collectables: new Map<CollectableTypes, boolean|number>(Array.from(state.collectables).map(([key, collectable])=>[key, collectable.getValue()])),
	  difficulty: optionDifficulty,
	  consumableEgg: false,
	  consumableWatermelon: false,
	  canSeeClouds: true
	});
	let blocked = !isBeatable;
	let canBeSubstitutedByConsumable = false;
	if(blocked) {
	  canBeSubstitutedByConsumable = checkForConsumable(goal, CollectableTypes.Egg, optionDifficulty);
	  blocked = !canBeSubstitutedByConsumable;
	}
	if(blocked) {
	  canBeSubstitutedByConsumable = checkForConsumable(goal, CollectableTypes.Watermelon, optionDifficulty);
	  blocked = !canBeSubstitutedByConsumable;
	}
	goal.htmlImage.classList.toggle("completed", false);
	goal.htmlImage.classList.toggle("blocked", blocked);
	if(!blocked&&optionDifficulty==0) {
	  goal.htmlImageLenseNeeded.classList.toggle("isNeeded",!goal.evaluateRules({
		  collectables: new Map<CollectableTypes, boolean|number>(Array.from(state.collectables).map(([key, collectable])=>[key, collectable.getValue()])),
		  difficulty: optionDifficulty,
		  consumableEgg: true,
		  consumableWatermelon: true,
		  canSeeClouds: false
		}));
	}
	if(optionShowHardMode&&!isBeatable&&optionDifficulty<2) {
	  isBeatable = goal.evaluateRules({
		collectables: new Map<CollectableTypes, boolean|number>(Array.from(state.collectables).map(([key, collectable])=>[key, collectable.getValue()])),
		difficulty: optionDifficulty+1,
		consumableEgg: false,
		consumableWatermelon: false,
		canSeeClouds: true
	  });
	  let blocked = !isBeatable;
	  if(!isBeatable&&!canBeSubstitutedByConsumable) {
	    canBeSubstitutedByConsumable = checkForConsumable(goal, CollectableTypes.Egg, optionDifficulty+1);
	    blocked = !canBeSubstitutedByConsumable;
	  }
	  if(!isBeatable&&!canBeSubstitutedByConsumable) {
	    canBeSubstitutedByConsumable = checkForConsumable(goal, CollectableTypes.Watermelon, optionDifficulty+1);
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
  resetLogicInfobox();
  autotracker = createAutotracker();
  autotracker.addConnectionStatusListener(updateSniConnectionStatus);
  onPortChanged();
}

function setupMenuInHTML() : void {
  let difficultyDropdown = <HTMLSelectElement>document.getElementById("difficulty_dropdown");
  difficultyDropdown.value = optionDifficulty.toString();
  
  let bowserCastleRouteDropdown = <HTMLSelectElement>document.getElementById("bc_route_dropdown");
  bowserCastleRouteDropdown.value = window.optionBowserCastleRoute.toString();  
  
  let checkBoxShowHardMode = <HTMLInputElement>document.getElementById("chkShowHardMode");
  checkBoxShowHardMode.checked = optionShowHardMode;  
  
  let levelListElement = <HTMLElement>document.getElementById("levelList");
  for(let [id,name] of levelNames.entries()) {
    levelListElement.appendChild(Object.assign(document.createElement("option"), { value: name }));
  }
  doSearchLevel();
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
	collectable.addDataChangeListener((col)=>updateCollectable(col));
	cellElement.append(collectable.htmlImage,collectable.htmlImageSubstitute);
	rowElement.appendChild(cellElement);
  }
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
		  className: "worldIcon level-"+world.level
		});
		world.htmlElement = worldLabeledIcon;
		if (world.level===9) {
		  let worldLockToggle = Object.assign(document.createElement("img"), {
		    id: "world-lock-toggle-"+worldId,
		    className: "worldLockToggle"+(world.isLocked()?" isLocked":""),
		    onclick: (e:Event) => world.toggleLocked()
		  });
		  world.addLockChangeListener((lvl)=>{
		    worldLockToggle.classList.toggle("isLocked", lvl.isLocked());
			for(let g of lvl.goals) {
			  updateWorldGoalState(g);
			}
		  });
		  worldLabeledIcon.appendChild(worldLockToggle);
		}
		let worldLabel = Object.assign(document.createElement("a"), {
		  href: "https://www.mariouniverse.com/wp-content/img/maps/snes/yi/"+world.world+"-"+(world.level<9?world.level:"ex")+".png",
		  className: "worldLabel",
		  target: "_blank",
		  textContent: worldId,
		});
		let worldImage = Object.assign(document.createElement("img"), {
		  src: "images/worlds/" + worldId + ".png",
		  id: "world-"+worldId,
		  className: "worldIconImage",
		  title: world.name,
		  width: 48,
		  height: 48,
		  onclick: (e:Event) => toggleAllWorldGoalCompleted(world)
		});
		let worldImageFinish = Object.assign(document.createElement("img"), {
		  id: "world-"+worldId+"-finish",
		  className: "worldFinishedImage",
		  width: 54,
		  onclick: (e:Event) => toggleAllWorldGoalCompleted(world)
		});
		if(world.isBossLevel()) {
		  worldLabeledIcon.classList.add("castle");
		  worldImage.classList.add("castle");
          if(!world.isBowserLevel()) {
		    worldImage = Object.assign(worldImage, {
		      src: "images/worlds/" + world.boss.id + ".png",
			  draggable: true,
			  dropzone: "move string:text/html",
			  ondragstart: (e:DragEvent)=> dragStartBoss(e, world),
			  ondragover: (e:DragEvent)=> e.preventDefault(),
			  ondrop: (e:DragEvent)=> dropBoss(e, world)
			});
		  }
		}
		worldLabeledIcon.append(worldImage,worldLabel,worldImageFinish);
		
		// Goals
		let goalsCol = Object.assign(document.createElement("div"), {
		  className: "worldGoals col"
		});
		for(let goal of world.goals) {
		  let goalsCell = Object.assign(document.createElement("div"), {
			className: "worldGoals row",
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
          updateWorldGoalState(goal);
		  goal.addDataChangeListener((goal)=> updateWorldGoalState(goal));
		  goalsCell.append(goal.htmlImage, goal.htmlImageSubstitute,goal.htmlImageLenseNeeded,goal.htmlImageBeatableWithHarderDifficulty);
	      goalsCol.appendChild(goalsCell);
		}
	    rowElement.append(worldLabeledIcon, goalsCol);
  }
  state.addWorldOpenChangeListener((world, isOpen)=> notifyWorldIsOpenChanged(null, world, isOpen));
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
  goal.setCompleted(!goal.isCompleted());
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
function dragStartBoss(event: DragEvent, world: WorldLevel) {
  if(event.target instanceof Element) {
    event.dataTransfer.setData("text/plain", world.getId());
	event.dataTransfer.effectAllowed = "move";
  }
}
function dropBoss(event: DragEvent, world: WorldLevel) {
  if(!(event.target instanceof Element))
    return;
  let startWorld = state.worldLevels.get(event.dataTransfer.getData("text/plain"));
  if(startWorld&&startWorld!=world) {
    world.switchBossWithLevel(startWorld);
      setupWorldsInHTML();
  }
}

function setGoalRequirementsHighlights(goal: WorldGoal) : void {
  const nullText = "No items needed.";
  let displayText = "";
  let combinedFuncText = "";
  for(let [key, funcString] of goal.getRulesAsStrings({
	  collectables: new Map<CollectableTypes, boolean|number>(Array.from(state.collectables).map(([key, collectable])=>[key, collectable.getValue()])),
	  difficulty: optionDifficulty,
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
		    if(parseInt(match[1]) > <number>collectable.getValue()) {
			  isCollected = false;
			  break;
			}
		  }
		} else {
		  isNeeded = combinedFuncText.indexOf("\""+collectable.collectableType+"\"") > 0;
		  isCollected = <boolean>collectable.getValue();
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
				[key, c])=>[key, key==collectable.collectableType?c.getValue():c.maxValue?c.maxValue:true])),
			  difficulty: optionDifficulty,
			  consumableEgg: false,
			  consumableWatermelon: false,
			  canSeeClouds: true
			}));
	});
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
    updateWorldGoalState(goal);
  }
}

function onDifficultyChanged(): void {
  let difficultyDropdown = <HTMLSelectElement>document.getElementById("difficulty_dropdown");
  optionDifficulty = parseInt( difficultyDropdown.value );
  window.localStorage.setItem(difficultyStorage,difficultyDropdown.value);
  updateAllWorldGoals();
}

function onBowserCastleRouteChanged(): void {
  let bowserCastleRouteDropdown = <HTMLSelectElement>document.getElementById("bc_route_dropdown");
  window.optionBowserCastleRoute = <BowserCastleRouteTypes>bowserCastleRouteDropdown.value
  window.localStorage.setItem(bowserCastleRouteStorage,bowserCastleRouteDropdown.value);
  updateAllWorldGoals();
}

function onShowHardModeChanged(): void {
  let checkBoxShowHardMode = <HTMLInputElement>document.getElementById("chkShowHardMode");
  optionShowHardMode = checkBoxShowHardMode.checked;
  window.localStorage.setItem(showHardModeStorage,optionShowHardMode.toString());
  updateAllWorldGoals();
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

function doSearchLevel() {
  let inputField = <HTMLInputElement>document.getElementById("inputLevelSearch");
  let resultField = <HTMLElement>document.getElementById("levelSearchResult");
  let result: string = "";

  if(inputField.value && inputField.value.length>0)
  for(let [id,name] of levelNames.entries()) {
    if(name.toLowerCase().startsWith(inputField.value.toLowerCase())) {
	  result = "> "+id;
	}
  }
  resultField.textContent = result;
}