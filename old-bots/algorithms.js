import {SPECS} from 'battlecode';
import {PriorityQueue} from './priorityqueue'

export const Algorithms = (function() {
    function dist(a, b) {
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Element-wise list equality.
     */
    function arrEq(a, b) {
        return a.length == b.length && a.map((v, i) => b[i] == v).reduce((x, y) => x && y);
    }

    function distSquared(a, b) {
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        return dx * dx + dy * dy;
    }

    function getSpeed() {
        return SPECS.UNITS[this.me.unit].SPEED;
    }

    function containsCoordinate(obj, list) {
        for (let i = 0; i < list.length; i++) {
            if (list[i][0] === obj[0] && list[i][1] === obj[1]) {
                return true;
            }
        }
        return false;
    }

    /**
     * Given a squared radius
     * returns a list of all possible moves [dx,dy]
     */
    function moves(r2) {
        let steps = []
        let max = Math.sqrt(r2);
        for (let x = -max; x <= max; x++) {
            for (let y = -max; y <= max; y++) {
                if (x * x + y * y <= r2) {
                    steps.push([x, y]);
                }
            }
        }
        return steps;
    }

    /**
     * Given a squared radius, current x position, current y position
     * returns a list of all possible locations that
     * can be reached in a single move [x,y]
     */
    function absoluteMoves(r2, curx, cury) {
        let steps = []
        let max = Math.sqrt(r2);
        for (let x = -max; x <= max; x++) {
            for (let y = -max; y <= max; y++) {
                if (x * x + y * y <= r2) {
                    steps.push([x + curx, y + cury]);
                }
            }
        }
        return steps;
    }

    return {
        dist: dist,

        /**
         * Returns the reflected position of this across the map.
         */
        reflection: function() {
            let vertical = this.fuel_map.every(
                                r => r.map((v, i) => r[r.length - i - 1] == v).reduce((a, b) => a && b));
            if (vertical) {
                return [this.fuel_map[0].length - this.me.x - 1, this.me.y];
            } else {
                return [this.me.x, this.fuel_map.length - this.me.y - 1];
            }
        },

        occupied: function(x, y) {
            try {
                return !this.map[y][x] || this.getVisibleRobotMap()[y][x] != 0;
            } catch (e) {
                return true;
            }
        },

        /**
         * Get list of resources ordered by nearness.
         */
        findResources: function() {
            let map1 = this.fuel_map;
            let map2 = this.karbonite_map;
            let x = this.me.x;
            let y = this.me.y;
            let pos = [];
            for (let i = 0; i < map1.length; i++) {
                for (let j = 0; j < map1.length; j++) {
                    if (map1[j][i] || map2[j][i])
                        pos.push([distSquared([x, y], [i, j]), [i, j]]);
                }
            }
            return pos.sort((a, b) => a[0] - b[0]).map(x => x[1]);
        },

        /**
         * Return random, valid, one-tile move.
         */
        randomMove: function() {
            const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
            let choice = choices[Math.floor(Math.random() * choices.length)]
            for (;;) {
                let locx = this.me.x + choice[0];
                let locy = this.me.y + choice[1];
                if (!this.occupied(locx, locy))
                    break;
                choice = choices[Math.floor(Math.random() * choices.length)];
            }
            return choice;
        },

        /**
        *   Takes in list of destinations [x,y]
        *   Returns an arraylist of [dx,dy] instructions at every location on map
        *   which correspond to the optimal move at every location (a.k.a a vector field)
        */
        vectorField: function(endpts) {
            let map = this.map;
            queue = []
            // TODO: implement
        },

        /**
         * Takes in destination [x, y].
         * Returns next move.
         */
        bfs: function(dest) {
            let start = [this.me.x, this.me.y];
            let map = this.map;
            let occupied = this.getVisibleRobotMap();

            let queue = []
            let visited = {}
            let hash = p => p[0] * 100 + p[1];
            let dehash = p => [Math.floor(p/100), p%100];
            let direction = {}
            queue.push(start);

            let i=0;
            while(queue.length>0) {
                //this.log(i);
                i++;
                //if(i==100)
                    //return [0,0];
                let current = queue.pop();
                let moves = longAbsoluteMoves(getSpeed.call(this), current[0], current[1]);
                for(let move of moves) {
                    if(withinOne(move, dest)) { //if this is destination, rebuild path
                        //this.log("Start: "+start+" Move: "+move+" Dest: "+dest+" Turn: "+i);
                        let path = []
                        path.push(move)
                        let loop = current; 
                        //return [0,0];
                        while (!arrEq(loop, start)) {
                            path.push(loop);
                            loop = dehash(direction[hash(loop)]);
                            console.log(loop);
                        }
                        path.push(start);
                        //return [0,0];
                        path.reverse();
                        this.log(path); //this.log(path[0]+" "+path[1]+" "+path[2]+" "+path[3]+" "+path[4]+" "+path[5]);
                        this.log([ (path[1])[0] - (path[0])[0], (path[1])[1] - (path[0])[1] ]);
                        return [ (path[1])[0] - (path[0])[0], (path[1])[1] - (path[0])[1] ];
                    }
                    else if(move[1] >=0 && move[0] >= 0 && move[1]<map.length && move[0]<map[0].length && 
                                map[move[1]][move[0]] && occupied[move[1]][move[0]]<=0 && visited[hash(move)]==undefined) { //not occupied   
                        //this.log("Added");
                        queue.push(move);
                        visited[hash(move)] = true;
                        if(arrEq(current, start)) //add dir if initial move
                            direction[hash(move)] = hash(start);
                        else 
                            direction[hash(move)] = hash(current);
                    }
                }
            }
            this.log("BFS failed");
            return [0,0];
        },

        /**
         * Takes in destination [x, y].
         * Return a list of [dx, dy] instructions to get from current location to destination.
         */
        path: function(dest) {
            let start = [this.me.x, this.me.y];
            let map = this.map;
            let occupied = this.getVisibleRobotMap();
            // let empty = map.map((c, i) => c.map((v, j) => v && occupied[i][j] <= 0)); //all empty nodes
            if (!map[dest[1]][dest[0]] || occupied[dest[1]][dest[0]] > 0) {
                return [];
            }
            let openHash = {};
            let done = [];
            let cameFrom = {}; //used to reconstruct map
            let h = x => dist(dest, x) / getSpeed.call(this); //~steps away from destination
            let hash = p => p[0] * 67 * 73 + p[1];
            let g = {}; //distance from origin in terms of steps taken
            g[start] = 0;
            let f = {}; //g + heuristic (dist to destination)
            f[start] = h(start);

            const queue = new PriorityQueue((a, b) => f[a] < f[b]);
            queue.push(start);
            let i = 256;
            while (!queue.isEmpty()) {
                let current = queue.pop(); //pop from priority queue instead of magic symbols
                // this.log(`${current} => ${dest}`);
                done.push(current)
                if (i-- < 0 || arrEq(current, dest)) { //found destination
                    current = done.reduce((a, b) => h(a) < h(b) ? a : b)
                    let totalPath = [current];
                    while (current in cameFrom) { //reconstruct path
                        current = cameFrom[current];
                        totalPath.push(current);
                    }
                    let path = [];
                    for (let i = 1; i < totalPath.length; i++) { //reformat path
                        let [a, b] = totalPath[i];
                        let [c, d] = totalPath[i - 1];
                        path.push([c - a, d - b]);
                    }
                    path.reverse();
                    return path;
                }
                for (let neighbor of absoluteMoves(getSpeed.call(this), current[0], current[1])) { //loops over all moves
                    if (neighbor[1] >= map.length
                            || neighbor[0] >= map[0].length
                            || neighbor[1] < 0
                            || neighbor[0] < 0
                            || !map[neighbor[1]][neighbor[0]]
                            || occupied[neighbor[1]][neighbor[0]] > 0
                            || openHash[hash(neighbor)]
                            || g[neighbor] != undefined) //filters invalid moves or already taken moves
                        continue;
                    let tg = g[current] + 1; //increase step by 1
                    // this.log('adding')
                    queue.push(neighbor); //push
                    openHash[hash(neighbor)] = true;
                    cameFrom[neighbor] = current; //sets current path for backtrace
                    g[neighbor] = tg;
                    f[neighbor] = g[neighbor] + h(neighbor);
                }
            }
            return [];
        },
    }
})();