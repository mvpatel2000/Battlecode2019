import {SPECS} from 'battlecode';

export function Pilgrim() {
    this.turn = pilgrimTurn;
    this.spawnPoint = this.getVisibleRobots().filter(i => (i.unit == SPECS.CHURCH || i.unit == SPECS.CASTLE) &&
        Math.pow(i.x - this.me.x,2) + Math.pow(i.y - this.me.y,2) <= 2 && i.signal>=0)[0];

    this.baseLocation = [this.spawnPoint.x, this.spawnPoint.y];
    this.originalBaseLocation = this.baseLocation;
    this.mineLocation = this.decodeExactLocation(this.spawnPoint.signal);
    this.adjacentDestinations = this.distSquared(this.baseLocation, this.mineLocation) <= 2;

    this.resourceClusters = this.clusterResourceTiles();
    this.avoid = this.spawnPoint.unit == SPECS.CASTLE ? [this.reflectPoint(...this.pos())] : [];

    this.destination = this.mineLocation;
    this.karboniteMine = this.karbonite_map[this.mineLocation[1]][this.mineLocation[0]];
    this.fuelMine = this.fuel_map[this.mineLocation[1]][this.mineLocation[0]];
}

function pilgrimTurn() {
    let [x, y] = [this.me.x, this.me.y];

    //TODO: Add mission code to determine what type of cluster we're in / heading to

    if(!this.adjacentDestinations) { //switch mining base
        let adjacentBases = this.getVisibleRobots().filter(i => i.unit < 2 && this.distSquared([i.x,i.y], this.mineLocation)<=2)
        if(adjacentBases.length > 0) { //signal to original base
            this.signal(1*64*64+this.encodeExactLocation(this.mineLocation), this.distSquared([this.me.x, this.me.y], this.originalBaseLocation) );
                //this.log("Me: "+this.me.x+" "+this.me.y+" Mine: "+this.mineLocation+" Old Base: "+this.originalBaseLocation+" Signal: "+this.distSquared([this.me.x, this.me.y], this.originalBaseLocation) );
            this.baseLocation = [adjacentBases[0].x, adjacentBases[0].y];
            this.adjacentDestinations = true;
            return; 
        }
    }

    let escapemove = this.getOptimalHidingLocation();
    if( this.arrEq(this.destination, this.mineLocation) && x == this.mineLocation[0] && y == this.mineLocation[1]) { //at mine
        let myClusterIndex = this.findNearestClusterIndex([this.me.x, this.me.y], this.resourceClusters);
        let myCluster = this.resourceClusters[myClusterIndex];
        let lookForBase = this.centroid(myCluster);
        let onMission = this.getVisibleRobots().filter(i => i.unit < 2 && i.team == this.me.team
            && this.distSquared(lookForBase, [i.x, i.y])<=2).length == 0; //check if church/castle at centroid
        onMission = onMission && this.getVisibleRobots().filter(i => i.unit == 0 && i.team == this.me.team 
            && this.distSquared(lookForBase, [i.x, i.y])<=16).length == 0; //check if castle nearby
        if(this.karbonite > 80 && this.fuel > 300 && onMission) { //want to build mission church for mission
            let target = this.exactCentroid(myCluster);
            let choice = this.getChurchSpawnLocation(target[0], target[1]);
            if(choice != null) {
                this.signal(this.encodeExactLocation(this.mineLocation), 2);
                this.baseLocation = [this.me.x + choice[0], this.me.y + choice[1]];
                this.adjacentDestinations = true;
                // this.log("Pilgrim "+this.me.id+" starting a mission church at "+this.baseLocation);
                return this.buildUnit(SPECS.CHURCH, choice[0], choice[1]);
            }
        }
        if(this.karbonite > 200 && this.fuel > 400 && this.getVisibleRobots().filter(i => i.unit < 2 
            && i.team == this.me.team && this.distSquared([i.x, i.y], [this.me.x, this.me.y])<=2).length==0) { //church because floating cash
            let nearbyPilgrims = this.getVisibleRobots().filter(i => i.unit == SPECS.PILGRIM && Math.abs(i.x - this.me.x)<=2 && Math.abs(i.y - this.me.y)<=2);
            let target = [this.me.x,this.me.y];
            if(nearbyPilgrims.length > 0) {
                for(let nearbyCtr = 0; nearbyCtr<nearbyPilgrims.length; nearbyCtr++) {
                    target[0] += nearbyPilgrims[nearbyCtr].x;
                    target[1] += nearbyPilgrims[nearbyCtr].y;
                }
                target[0] = Math.round(target[0] / (1+nearbyPilgrims.length));
                target[1] = Math.round(target[1] / (1+nearbyPilgrims.length));
            }
            let choice = this.getChurchSpawnLocation(target[0], target[1]);
            if(choice != null) {
                this.signal(0, 2);
                //this.baseLocation = [this.me.x + choice[0], this.me.y + choice[1]];
                return this.buildUnit(SPECS.CHURCH, choice[0], choice[1]);
            }
        }
        else if( this.fuel > 1 && ((this.fuelMine && this.me.fuel < SPECS.UNITS[this.me.unit].FUEL_CAPACITY)
            || (this.karboniteMine && this.me.karbonite < SPECS.UNITS[this.me.unit].KARBONITE_CAPACITY)) ) { //want to mine
            if(escapemove.length > 0 && !this.arrEq(escapemove[0],[this.me.x,this.me.y]) 
                && this.fuel > (SPECS.UNITS[this.me.unit].FUEL_PER_MOVE * this.getSpeed())) { //must flee if optimal dodge is not stay still
                return this.move(...[escapemove[0][0] - this.me.x, escapemove[0][1] - this.me.y]);
            }
            return this.mine();
        }
        else if(!onMission) { //move back to base
            this.destination = this.baseLocation;
        }
    }
    if( this.arrEq(this.destination, this.baseLocation) && this.distSquared([x,y], this.baseLocation) <=2 ) { //at base
        if(escapemove.length > 0 && !this.arrEq(escapemove[0],[this.me.x,this.me.y]) 
            && this.fuel > (SPECS.UNITS[this.me.unit].FUEL_PER_MOVE * this.getSpeed())) { //must flee if optimal dodge is not stay still
            return this.move(...[escapemove[0][0] - this.me.x, escapemove[0][1] - this.me.y]);
        }
        let base = this.getVisibleRobots().filter(i => (i.unit == SPECS.CHURCH || i.unit == SPECS.CASTLE) &&
            Math.pow(i.x - this.me.x,2) + Math.pow(i.y - this.me.y,2) <= 2);
        if(base.length>0) {
            this.destination = this.mineLocation;
            this.signal(this.encodeExactLocation(this.mineLocation), 2);
            return this.give(base[0].x - x, base[0].y -y, this.me.karbonite, this.me.fuel);
        }
    }

    let route;
    if( this.arrEq(this.destination, this.mineLocation) ) { //moving to mine
        route = this.path(this.destination);
        
    }
    else { //( this.arrEq(this.destination, this.baseLocation) ) //moving to base
        route = this.workerpath(this.destination);
    }

    if (this.fuel > (SPECS.UNITS[this.me.unit].FUEL_PER_MOVE * this.getSpeed()) && route.length > 0) { //A* towards target
        if(escapemove.length > 0) { //flee in direction of path
            let [dx, dy] = route.length ? route[0] : [0, 0];
            let old = [this.me.x + dx, this.me.y + dy];
            let finmove = escapemove.reduce((a, b) => this.dist(a, old) < this.dist(b, old) ? a : b);
            if (finmove[0] == this.me.x && finmove[1] == this.me.y) {
                return;
            } else {
                return this.move(...[finmove[0] - this.me.x, finmove[1] - this.me.y]);
            }
        }
        else { //move normally
            return this.move(...route[0]);
        }
    }
    
    return;
}