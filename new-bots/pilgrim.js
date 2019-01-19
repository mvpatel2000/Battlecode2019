import {SPECS} from 'battlecode';

export function Pilgrim() {
    this.turn = pilgrimTurn;
    //this.spawnPoint = this.getVisibleRobots().filter(i => (i.unit == SPECS.CHURCH || i.unit == SPECS.CASTLE) &&
    //    Math.pow(i.x - this.me.x,2) + Math.pow(i.y - this.me.y,2) <= 2 && this.signal>=0);
    this.spawnPoint = this.getVisibleRobots().filter(i => (i.unit == SPECS.CHURCH || i.unit == SPECS.CASTLE) &&
        Math.pow(i.x - this.me.x,2) + Math.pow(i.y - this.me.y,2) <= 2 && i.signal>=0)[0];

    this.baseLocation = [this.spawnPoint.x, this.spawnPoint.y];
    this.mineLocation = this.decodeExactLocation(this.spawnPoint.signal);
    this.destination = this.mineLocation;
    this.karboniteMine = this.karbonite_map[this.mineLocation[1]][this.mineLocation[0]];
    this.fuelMine = this.fuel_map[this.mineLocation[1]][this.mineLocation[0]];
}

function pilgrimTurn() {
    let [x, y] = [this.me.x, this.me.y];

    //TODO: Add mission code to determine what type of cluster we're in / heading to
    //TODO: Add code to report status so church can replace if dead
    //TODO: Kiting is performing suboptimally. Fix this

    let escapemove = this.getOptimalHidingLocation(); //TODO: Add condition to hold ground anyways if there are suffient defenses
    //this.log(escapemove)
    if( this.arrEq(this.destination, this.mineLocation) && x == this.mineLocation[0] && y == this.mineLocation[1]) { //at mine
        if(false) { //want to build church
            //TODO: consider if there are enemies && can hold groud by dropping church isntead of fleeing
            this.log("FAIL");
            //add code to reset base as church
            //TODO: Add condition to build second church if late game and not msision boi 
            return;
        }
        else if( (this.fuelMine && this.me.fuel < SPECS.UNITS[this.me.unit].FUEL_CAPACITY)
            || (this.karboniteMine && this.me.karbonite < SPECS.UNITS[this.me.unit].KARBONITE_CAPACITY) ) { //want to mine
            if(escapemove.length > 0 && !this.arrEq(escapemove[0],[this.me.x,this.me.y]) 
                && this.fuel > (SPECS.UNITS[this.me.unit].FUEL_PER_MOVE * this.getSpeed())) { //must flee if optimal dodge is not stay still
                this.log("Turn: "+this.me.turn+" Move: "+escapemove[0]+" ("+this.me.x+", "+this.me.y+") Delta: "+([escapemove[0][0] - this.me.x, escapemove[0][1] - this.me.y]));
                this.log(escapemove)
                return this.move(...[escapemove[0][0] - this.me.x, escapemove[0][1] - this.me.y]);
            }
            return this.mine();
        }
        else { //move back to base
            this.destination = this.baseLocation;
        }
    }
    if( this.arrEq(this.destination, this.baseLocation) && Math.pow(x - this.baseLocation[0],2) + Math.pow(y - this.baseLocation[1], 2) <=2 ) { //at base
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
            this.log("Turn: "+this.me.turn+" Move: "+escapemove[0]+" ("+this.me.x+", "+this.me.y+") Delta: "+([escapemove[0][0] - this.me.x, escapemove[0][1] - this.me.y]));
            this.log(escapemove)
//            return this.move(...[escapemove[0][0] - this.me.x, escapemove[0][1] - this.me.y]);

//TODO: THE CODE HERE SEEMS INEFFICIENT. FIX THIS!!!!
            let [dx, dy] = route.length ? route[0] : [0, 0];
            let old = [this.me.x + dx, this.me.y + dy];
            let finmove = escapemove.reduce((a, b) => this.dist(a, old) < this.dist(b, old) ? a : b);
            //if best possible move is to stay still, return nothing.
            if (finmove[0] == this.me.x && finmove[1] == this.me.y) {
                return;
            } else {
                return this.go(finmove);
            }
        }
        else { //move normally
            return this.move(...route[0]);
        }
    }
    
    return;
}