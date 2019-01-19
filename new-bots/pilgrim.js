import {SPECS} from 'battlecode';

export function Pilgrim() {
    this.turn = pilgrimTurn;
    //this.spawnPoint = this.getVisibleRobots().filter(i => (i.unit == SPECS.CHURCH || i.unit == SPECS.CASTLE) &&
    //    Math.pow(i.x - this.me.x,2) + Math.pow(i.y - this.me.y,2) <= 2 && this.signal>=0);
    this.spawnPoint = this.getVisibleRobots().filter(i => (i.unit == SPECS.CHURCH || i.unit == SPECS.CASTLE) &&
        Math.pow(i.x - this.me.x,2) + Math.pow(i.y - this.me.y,2) <= 2 && i.signal>=0)[0];

    this.baseLocation = [this.spawnPoint.x, this.spawnPoint.y];
    this.mineLocation = this.decodeExactLocation(this.spawnPoint.signal);
    this.adjacentDestinations = this.distSquared(this.baseLocation, this.mineLocation) <= 2;

    this.destination = this.mineLocation;
    this.karboniteMine = this.karbonite_map[this.mineLocation[1]][this.mineLocation[0]];
    this.fuelMine = this.fuel_map[this.mineLocation[1]][this.mineLocation[0]];
}

function pilgrimTurn() {
    let [x, y] = [this.me.x, this.me.y];

    //TODO: Add mission code to determine what type of cluster we're in / heading to
    //TODO: Add code to report status so church can replace if dead
    //TODO: Kiting is performing suboptimally. Fix this
    if(!this.adjacentDestinations) {
        let adjacentBases = this.getVisibleRobots().filter(i => i.unit < 2 && this.distSquared([i.x,i.y], this.mineLocation)<=2)
        if(adjacentBases.length > 0) {
            this.baseLocation = [adjacentBases[0].x, adjacentBases[0].y];
            this.adjacentDestinations = true;
        }
    }

    let escapemove = this.getOptimalHidingLocation(); //TODO: Add condition to hold ground anyways if there are suffient defenses
    //this.log(escapemove)
    if( this.arrEq(this.destination, this.mineLocation) && x == this.mineLocation[0] && y == this.mineLocation[1]) { //at mine
        if(false) { //want to build church for mission
            //TODO: consider if there are enemies && can hold groud by dropping church isntead of fleeing
            //add code to reset base as church
            return;
        }
        if(this.karbonite > 400 && this.fuel > 400 && this.getVisibleRobots().filter(i => i.unit < 2 
            && i.team == this.me.team && this.distSquared([i.x, i.y], [this.me.x, this.me.y])<=2).length==0) { //church because floating cash
            let nearbyPilgrims = this.getVisibleRobots().filter(i => i.unit == SPECS.PILGRIM && this.distSquared([i.x, i.y], [this.me.x, this.me.y])<=4);
            let target = [1,0];
            if(nearbyPilgrims.length > 0)
                target = [ Math.min(Math.max(nearbyPilgrims[0].x - this.me.x,1),-1), Math.min(Math.max(nearbyPilgrims[0].y - this.me.y,1),-1)]
            let choice = this.getChurchSpawnLocation(target[0], target[1]);
            if(choice != null) {
                this.signal(1, 2);
                this.baseLocation = [this.me.x + choice[0], this.me.y + choice[1]];
                return this.buildUnit(SPECS.CHURCH, choice[0], choice[1]);
            }
        }
        else if( (this.fuelMine && this.me.fuel < SPECS.UNITS[this.me.unit].FUEL_CAPACITY)
            || (this.karboniteMine && this.me.karbonite < SPECS.UNITS[this.me.unit].KARBONITE_CAPACITY) ) { //want to mine
            if(escapemove.length > 0 && !this.arrEq(escapemove[0],[this.me.x,this.me.y]) 
                && this.fuel > (SPECS.UNITS[this.me.unit].FUEL_PER_MOVE * this.getSpeed())) { //must flee if optimal dodge is not stay still
                return this.move(...[escapemove[0][0] - this.me.x, escapemove[0][1] - this.me.y]);
            }
            return this.mine();
        }
        else { //move back to base
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
        if(base.length>0) { //we don't flee here! better to return resources then to flee
            this.destination = this.mineLocation;
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