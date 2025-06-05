class APGameData {
  readonly gameName: string;
  readonly locationAPIdToNameMap: Map<number, string> = new Map<number, string>();
  readonly collectablesAPIdToNameMap: Map<number, string> = new Map<number, string>();
  
  constructor(gameName: string) {
	  this.gameName = gameName;
  }
}
class APPlayer {
	alias: string;
	name: string;
	team: number;
	slot: number;
	game: string;
	getPlayerName(): string {
		return this.alias+(this.alias !== this.name?"("+this.name+")":"");
	}
}
class APHintReply {
	entrance: string;
	finding_player: number;
	found: boolean;
	item: number;
	item_flags: number;
	location: number;
	receiving_player: number;
	status: number;
}
class APClient {
  private gameName: string;
  private APTeam: number;
  private APSlot: number;
  readonly APPlayers: Map<number, APPlayer> = new Map<number, APPlayer>();
  readonly gameOptions: ObservableMap<GameOptions, string|number|boolean>;
  readonly isConnected: Observable<boolean> = new Observable(false);
  readonly checkedLocations: ObservableArray<string> = new ObservableArray([]);
  readonly allAvaillableLocations: ObservableArray<string> = new ObservableArray([]);
  readonly itemsReceived: ObservableArray<string> = new ObservableArray([]);
  readonly slotData: Observable<any> = new Observable<any>(null);
  readonly connectionStatus: Observable<string> = new Observable(null);
  readonly hintsForLocations: ObservableArray<HintForLocation> = new ObservableArray([], true);
  private webSocket: WebSocket;
  
  readonly gameData: Map<string, APGameData> = new Map<string, APGameData>();
  private uuid = crypto.randomUUID();
  
  notifyGameOptionChanged(gameOption: GameOptions, value: string|number|boolean) {
	  if(gameOption === GameOptions.ArchipelagoURL ||
	     gameOption === GameOptions.ArchipelagoPort ||
	     gameOption === GameOptions.ArchipelagoSlotName ||
	     gameOption === GameOptions.ArchipelagoPassword) 
	  {
	    this.cleanup();
	  }
  }
  
  constructor(gameName: string, gameOptions: ObservableMap<GameOptions, string|number|boolean>) {
	  this.gameOptions = gameOptions;
	  this.gameName = gameName;
  }

  getKeyForReadHintCommand(): string {
	return "_read_hints_"+this.APTeam+"_"+this.APSlot;
  } 
  
  connect(): void {
    if (this.webSocket) {
        this.cleanup();
        return;
    }
	let url: string = <string> this.gameOptions.get(GameOptions.ArchipelagoURL);
	let port: number = <number> this.gameOptions.get(GameOptions.ArchipelagoPort);
	if(url?.length<1||port<1) {
      this.connectionStatus.set(null);
	  return;
	}
    this.connectionStatus.set("Connecting");
	
    this.webSocket = new WebSocket((url==="localhost"?"ws://":"wss://")+url+":"+port);
    this.webSocket.binaryType = 'arraybuffer';

    this.webSocket.onclose = (event) => {
        this.cleanup();
        this.connectionStatus.set("Disconnected: " + event.reason);
    }

    this.webSocket.onerror = (event) => {
        this.cleanup();
		let url = (<WebSocket>event.target).url;
        this.connectionStatus.set("Error: Unable to connect to server: "+url);		
    }
	    
    this.webSocket.onopen = (event) => this.onConnect(event);
	this.webSocket.onmessage = (event) => this.onMessage(event);
  }
  
  private onConnect(event: Event) : void {
    this.connectionStatus.set("Connected, requesting devices list");
  }
  
  private onHintsReply(apHints: Array<APHintReply>) : void {
	  if(!apHints)
		  return;
	  let locHints: Array<HintForLocation> = new Array<HintForLocation>();
	  for(let apHint of apHints) {
		  if(apHint.finding_player === this.APSlot) {
			  // Hint for Players Location
			  let receiving_player: APPlayer = this.APPlayers.get(apHint.receiving_player);
			  locHints.push(Object.assign(new HintForLocation(), {
					location_name: this.gameData.get(this.gameName).locationAPIdToNameMap.get(apHint.location),
					receivingPlayer: receiving_player.getPlayerName(),
					item_name: this.gameData.get(receiving_player.game).collectablesAPIdToNameMap.get(apHint.item),
				    item_flags: apHint.item_flags}));
		  }
	  }
	  this.hintsForLocations.set(locHints);
	  //console.log("onHintsReply");
	  //console.log(locHints);
  }
  
  private onMessage(event: MessageEvent) {
	let myGameData: APGameData = this.gameData.get(this.gameName);
	this.isConnected.set(true);
	for(let msg of JSON.parse(event.data)) {
	  //console.log(msg);
	  if(msg.cmd === "Connected" || msg.cmd === "RoomUpdate")  {
		  this.checkedLocations.set(msg.checked_locations.map((id:number)=>myGameData.locationAPIdToNameMap.get(id)));
		  if(msg.cmd === "Connected") {
			  this.slotData.set(msg.slot_data);
			  let allLocations : Array<number> = msg.checked_locations.concat(msg.missing_locations);
			  this.APTeam = msg.team;
			  this.APSlot = msg.slot;
			  for(let player of msg.players) {
				  this.APPlayers.set(player.slot, 
				    Object.assign(new APPlayer(), {
						alias: player.alias,
						name: player.name,
						team: player.team,
						slot: player.slot,
						game: msg.slot_info[player.slot].game
					}));
			  }
			  this.webSocket.send(JSON.stringify([{
					cmd: "Get",
					keys: [this.getKeyForReadHintCommand()]
			  }])); 
			  this.webSocket.send(JSON.stringify([{
					cmd: "SetNotify",
					keys: [this.getKeyForReadHintCommand()]
			  }])); 
		      this.allAvaillableLocations.set(allLocations.map((id:number)=>myGameData.locationAPIdToNameMap.get(id)));
		  }
	  } else if (msg.cmd === "ReceivedItems")  {
		  if(msg.index === 0) {
		    this.itemsReceived.set(msg.items.map((item:any)=>myGameData.collectablesAPIdToNameMap.get(item.item)));
		  } else {
			this.itemsReceived.set(this.itemsReceived.get().concat(msg.items.map((item:any)=>myGameData.collectablesAPIdToNameMap.get(item.item))));
		  }
	  } else if (msg.cmd === "DataPackage")  { 
		  for(let gameName of Object.keys(msg.data.games)) {
			  let gameData: APGameData = new APGameData(gameName);
	          let itemNameToId = msg.data.games[gameName].item_name_to_id;
		      let locationNameToId = msg.data.games[gameName].location_name_to_id;
		  
			  for(let name of Object.keys(itemNameToId)) {
				  gameData.collectablesAPIdToNameMap.set(itemNameToId[name], name);
			  }
			  for(let name of Object.keys(locationNameToId)) {
				  gameData.locationAPIdToNameMap.set(locationNameToId[name], name);
			  }
			  this.gameData.set(gameName, gameData);
		  }
			this.webSocket.send(JSON.stringify([{
				cmd: "Connect",
				game: this.gameName,
				version: {"major":0,"minor":6,"build":1,"class":"Version"},
				name: <string> this.gameOptions.get(GameOptions.ArchipelagoSlotName),
				password: <string> this.gameOptions.get(GameOptions.ArchipelagoPassword),
				tags: ["Tracker","NoText","PopTracker","IgnoreGame"],
				items_handling: 3,
				uuid: this.uuid
			}])); 
	  } else if (msg.cmd === "RoomInfo")  { 
			this.webSocket.send(JSON.stringify([{
				cmd: "GetDataPackage",
				games: msg.games
			}])); 
	  } else if (msg.cmd === "ConnectionRefused")  {
          this.connectionStatus.set("Error: "+msg.errors[0]);		
		  this.cleanup();
	  } else if (msg.cmd === "Retrieved" && msg.keys[this.getKeyForReadHintCommand()]) {
		  this.onHintsReply(msg.keys[this.getKeyForReadHintCommand()]);
	  } else if (msg.cmd === "SetReply" && msg.key === this.getKeyForReadHintCommand()) {
		  this.onHintsReply(msg.value);
	  }
	}
  }
  
  private cleanup() {
	if(this.webSocket) {
		this.webSocket.onopen = (event)=>{};
		this.webSocket.onclose = (event)=>{};
		this.webSocket.onmessage = (event)=>{};
		this.webSocket.onerror = (event)=>{};
		this.webSocket.close();
    }
    this.webSocket = null;
	this.isConnected.set(false);
  }
  
  disconnect() {
    this.cleanup();
  }
}