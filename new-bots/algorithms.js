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
        return (dx * dx + dy * dy);
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
        distSquared: distSquared,
        getSpeed: getSpeed,

        /**
         * Gives list of valid move locations.
         */
        validAbsoluteMoves: function() {
            return absoluteMoves(this.getSpeed, this.me.x, this.me.y).filter(m => !this.occupied(m));
        },

        /**
         * Returns a move action to approach a target.
         */
        go: function(target) {
            let route = this.path(target); //path finding
            if (this.fuel > (SPECS.UNITS[this.me.unit].FUEL_PER_MOVE * this.getSpeed())) {
                if (route.length > 0) { //A* towards target
                    return this.move(...route[0]);
                } else { //random move
                    return this.move(...this.randomMove());
                }
            }
        },

        /**
         * Returns a robot to attack if possible.
         */
        getRobotToAttack: function() {
            const rad = SPECS.UNITS[this.me.unit].ATTACK_RADIUS;
            const priority = {
                0: 1,
                1: 2,
                2: 0,
                3: 3,
                4: 5,
                5: 4,
            };
            let robots = this.getVisibleRobots()
                             .filter(i =>
                                    (d => i.team != this.me.team
                                            && d >= rad[0]
                                            && d <= rad[1])(this.distSquared([i.x, i.y], [this.me.x, this.me.y])));
            if (robots.length)
                return robots.reduce((a, b) => priority[a.unit] > priority[b.unit] ? a : b);
        },

        /*
         * Returns the optimal absolute location you should move to
         * by minimizing hp damage from enemy robots around you.
         * Return value: null if NO enemies are present or the
         * max hp damage by enemy robots is 0.
         */
        getOptimalEscapeLocation: function() {
            let visibleRobots = this.getVisibleRobots().filter(i => i.unit > 2 && i.team != this.me.team);
            let hpdamage = 0;
            let minhpdamage = Infinity;
            let maxhpdamage = 0;
            let optimalmove = [];
            let possiblemoves = this.validAbsoluteMoves();
            for (let move of possiblemoves) {
                for (let i of visibleRobots) {
                    let dSquaredtoEnemy = distSquared([i.x, i.y], [move[0], move[1]])
                    if (i.team != this.me.team) {
                        hpdamage += this.expectedDamage(i, dSquaredtoEnemy);
                    }
                }
                if (hpdamage < minhpdamage) {
                    optimalmove = [move];
                    minhpdamage = hpdamage;
                } else if (hpdamage == minhpdamage) {
                    optimalmove.push(move);
                }
                if (hpdamage > maxhpdamage) {
                    maxhpdamage = hpdamage;
                }
            }
            if (maxhpdamage == 0) {
                return [];
            }
            return optimalmove;
        },

        /**
         * Returns the enemy locations.
         */
        getEnemyCastles: function() {
            let castles = this.getVisibleRobots().filter(i => i.team == this.me.team && i.unit == 0);
            while (castles.length < 3) { 
                castles.push(castles[castles.length-1]);
            }

            let vertical = this.fuel_map.every(
                                r => r.slice(0, r.length / 2)
                                .map((v, i) => r[r.length - i - 1] == v)
                                .reduce((a, b) => a && b));
            if (vertical) {
                let encodedEnemy = 0;
                for(let i = 0; i < castles.length; i++) {
                    encodedEnemy += Math.min(i,1)*(2**5)*this.encodeLocation(this.fuel_map[0].length - this.me.x - 1, this.me.y)
                }
                return encodedEnemy;
            } else {
                let encodedEnemy = 0;
                for(let i = 0; i < castles.length; i++) {
                    encodedEnemy += Math.min(i,1)*(2**5)*this.encodeLocation(this.me.x, this.fuel_map.length - this.me.y - 1)
                }
                return encodedEnemy;
            }
        },

        /**
         * Returns the zone # from x,y
         * current implementation: 8-bit integer, so we can
         * encode 2 zones in 1 comm (the two castles that
         * the attacker is not spawned in)
         * first 4 bits: x coord
         * second 4 bits: y coord
         */
        encodeLocation: function(x, y) {
            let sz = this.fuel_map.length;
            return 16*Math.floor(x*16/sz) + Math.floor(y*16/sz);
        },

        scaledDecodeLocation: function(enemyCastles, targetCtr) {
            let loc = this.decodeLocation(enemyCastles, targetCtr);
            let size = this.map.length;
            loc[0] = Math.floor(loc[0]/32*size);
            loc[1] = Math.floor(loc[1]/32*size);
            return loc;
        },

        /**
         * Returns x,y from the zone #
         */
        decodeLocation: function(zone) {
            let sz = this.fuel_map.length;
            let x = Math.floor(0.5+(Math.floor(zone/16)+0.5)*sz/16);
            let y = Math.floor(0.5+((zone%16)+0.5)*sz/16);
            return [x, y];
        },

        nearestEmptyLocation: function(loc) {
            let x = loc[0]
            let y = loc[1];
            let map = this.map;
            if(map[y][x])
                return loc;
            for(let dx = -2; dx<3; dx++) {
                for(let dy = -2; dy<3; dy++) {
                    if(map[y+dy][x+dx])
                        return [x+dx, y+dy];
                }
            }
        },

        /**
         * Returns the reflected position of castles across the map.
         */
        reflection: function() {
            let vertical = this.fuel_map.every(
                                r => r.slice(0, r.length / 2)
                                .map((v, i) => r[r.length - i - 1] == v)
                                .reduce((a, b) => a && b));
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
         * Given a robot, tells you if it can kill you.
         * Returns the amount of HP damage.
         */
        expectedDamage: function(i, dSquared) {
            let attack_rad2 = SPECS.UNITS[i.unit].ATTACK_RADIUS;
            if (attack_rad2 == NULL) {
                return 0;
            } else {
                if (attack_rad2[0] <= dSquared && dSquared <= attack_rad2[1]) {
                    return SPECS.UNITS[i.unit].ATTACK_DAMAGE;
                } else {
                    return 0;
                }
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
         * Return a random, valid, move within a given radius^2.
         */
        randomMoveRadiusSquared: function(r2) {
            if (r2 < 1) {
                return [0, 0];
            }
            let choices = [];
            let max = Math.sqrt(r2);
            for (let x = -max; x <= max; x++) {
                for (let y = -max; y <= max; y++) {
                    if (x * x + y * y <= r2) {
                        choices.push([x, y]);
                    }
                }
            }
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
         * Takes in destination [x, y].
         * Return a list of [dx, dy] instructions to get from current location to destination.
         */
        path: function(dest) {
            let start = [this.me.x, this.me.y];
            let map = this.map;
            let occupied = this.getVisibleRobotMap();
            if (dest[1] >= map.length
                || dest[0] >= map[0].length
                || dest[1] < 0
                || dest[0] < 0
                || !map[dest[1]][dest[0]]
                || occupied[dest[1]][dest[0]] > 0) {
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
