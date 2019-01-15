import {SPECS} from 'battlecode';
import {PriorityQueue} from './priorityqueue'

export const Algorithms = (function() {
    let seed = 1;

    function rand(len) {
        seed = ((seed + 3) * 7 + 37) % 8117
        return seed % len
    }

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
        rand: rand,

        /**
         * Gives list of valid move locations.
         */
        validAbsoluteMoves: function() {
            return absoluteMoves(this.getSpeed(), this.me.x, this.me.y).filter(m => !this.occupied(...m));
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
            const priority = { // unit target priority tiebreakers
                0: 1,
                1: 0,
                2: 2,
                3: 3,
                4: 3,
                5: 4,
            };
            let robots = this.getVisibleRobots()
                             .filter(i =>
                                    (d => i.team != this.me.team
                                            && d >= rad[0]
                                            && d <= rad[1])(this.distSquared([i.x, i.y], [this.me.x, this.me.y])));
            if (robots.length)
                return robots.reduce((a, b) => {
                    const threat = this.threat(b) - this.threat(a);
                    const type = priority[b.unit] - priority[a.unit];
                    const id = a.id - b.id;
                    return (threat ? threat : (type ? type : id)) > 0 ? b : a;
                });
        },

        /*
         * Returns the optimal absolute location you should move to
         * by minimizing hp damage from enemy robots around you.
         * Return value: null if NO enemies are present or the
         * max hp damage by enemy robots is 0.
         */
        getOptimalEscapeLocation: function() {
            let visibleRobots = this.getVisibleRobots().filter(i => i.unit > 2 && i.team != this.me.team);
            if (visibleRobots.length == 0) {
                return [];
            }
            let minhpdamage = Infinity;
            let maxhpdamage = 0;
            let optimalmove = [];
            let possiblemoves = this.validAbsoluteMoves();
            //add "staying still" to possible moves list
            possiblemoves.push([this.me.x,this.me.y]);
            //this.log(possiblemoves.length)
            for (let move of possiblemoves) {
                let hpdamage = 0;
                for (let i of visibleRobots) {
                    let dSquaredtoEnemy = distSquared([i.x, i.y], [move[0], move[1]])
                    hpdamage += this.expectedDamage(i, dSquaredtoEnemy);
                }
                //this.log(`movr=${move} hpp=${hpdamage}`);
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

        prepareTargets: function() {
            let enemyCastleLocations = []
            let castles = this.getVisibleRobots().filter(i => i.team == this.me.team && i.unit == 0);
            for (let i = 0; i < castles.length; i++) {
                let castle = castles[i];
                let signal = castle.signal;
                if (signal != undefined && signal!=-1) {
                    enemyCastleLocations.push(this.reflectPoint(castle.x, castle.y));
                    enemyCastleLocations.push(this.decodeLocation(signal % (2 ** 8)));
                    enemyCastleLocations.push(this.decodeLocation(Math.floor(signal / (2 ** 8))));
                    let myloc = [this.me.x, this.me.y];
                    if (this.distSquared(myloc, enemyCastleLocations[1]) < distSquared(myloc, enemyCastleLocations[0])) {
                        let a = enemyCastleLocations[0];
                        enemyCastleLocations[0] = enemyCastleLocations[1];
                        enemyCastleLocations[1] = a;
                    }
                    if (this.distSquared(myloc, enemyCastleLocations[2]) < distSquared(myloc, enemyCastleLocations[0])) {
                        let a = enemyCastleLocations[0];
                        enemyCastleLocations[0] = enemyCastleLocations[2];
                        enemyCastleLocations[2] = a;
                    }
                    if (this.distSquared(enemyCastleLocations[0], enemyCastleLocations[2]) < distSquared(enemyCastleLocations[0], enemyCastleLocations[1])) {
                        let a = enemyCastleLocations[2];
                        enemyCastleLocations[2] = enemyCastleLocations[1];
                        enemyCastleLocations[1] = a;
                    }
                    return enemyCastleLocations;
                }
            }
            let r = () => [rand(this.map[0].length),
                            rand(this.map.length)];
            let target = r();
            while (!this.map[target[1]][target[0]]) {
                target = r();
            }
            enemyCastleLocations.push(target)
            return enemyCastleLocations;
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
            return 16 * Math.floor(x * 16 / sz) + Math.floor(y * 16 / sz);
        },

        /**
         * Returns x,y from the zone #
         */
        decodeLocation: function(zone) {
            let sz = this.fuel_map.length;
            let x = Math.floor(0.5 + (Math.floor(zone / 16) + 0.5) * sz / 16);
            let y = Math.floor(0.5 + ((zone%16) + 0.5) * sz / 16);
            return this.nearestEmptyLocation(x, y);
        },

        /**
         * Returns x,y nearby that is empty
         */
        nearestEmptyLocation: function(x, y) {
            let sz = this.fuel_map.length;
            let map = this.map;
            if (map[y][x])
                return [x, y];
            for (let dx = -1; dx<2; dx++) {
                for (let dy = -1; dy<2; dy++) {
                    if (y + dy >= 0 && x + dx >= 0 && y + dy < sz && x + dx < sz && map[y + dy][x + dx])
                        return [x + dx, y + dy];
                }
            }
        },

        /**
         * Returns the reflected position of castles across the map.
         */
        reflectPoint: function(x, y) {
            let vertical = this.fuel_map.every(
                                r => r.slice(0, r.length / 2)
                                .map((v, i) => r[r.length - i - 1] == v)
                                .reduce((a, b) => a && b));
            if (vertical) {
                return [this.fuel_map[0].length - x - 1, y];
            } else {
                return [x, this.fuel_map.length - y - 1];
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
         * Run expectedDamage with current location.
         */
        threat: function(r) {
            return this.expectedDamage(r, this.distSquared([this.me.x, this.me.y], [r.x, r.y]));
        },

        /**
         * Given a robot, tells you if it can kill you.
         * Returns the amount of HP damage.
         */
        expectedDamage: function(i, dSquared) {
            let attack_rad2 = SPECS.UNITS[i.unit].ATTACK_RADIUS;
            if (!attack_rad2) {
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
            let choice = choices[rand(choices.length)]
            for (;;) {
                let locx = this.me.x + choice[0];
                let locy = this.me.y + choice[1];
                if (!this.occupied(locx, locy))
                    break;
                choice = choices[rand(choices.length)];
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
            let choice = choices[rand(choices.length)]
            for (;;) {
                let locx = this.me.x + choice[0];
                let locy = this.me.y + choice[1];
                if (!this.occupied(locx, locy))
                    break;
                choice = choices[rand(choices.length)];
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
            let done = new PriorityQueue((a, b) => h(a) < h(b));
            let prev = {}; //used to reconstruct map
            let h = x => (Math.abs(dest[0] - x[0]) + Math.abs(dest[1] - x[1])) / getSpeed.call(this); //~steps away from destination
            let hash = p => p[0] * 67 * 73 + p[1];
            let g = {}; //distance from origin in terms of steps taken
            g[start] = 0;
            let f = {}; //g + heuristic (dist to destination)
            f[start] = h(start);

            const queue = new PriorityQueue((a, b) => f[a] < f[b]);
            queue.push(start);
            let i = 128;
            while (!queue.isEmpty()) {
                let current = queue.pop(); //pop from priority queue instead of magic symbols
                done.push(current)
                if (i-- < 0 || arrEq(current, dest)) { //found destination
                    current = done.pop();
                    let totalPath = [current];
                    while (current in prev) { //reconstruct path
                        current = prev[current];
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
                    queue.push(neighbor); //push
                    openHash[hash(neighbor)] = true;
                    prev[neighbor] = current; //sets current path for backtrace
                    g[neighbor] = g[current] + 1;
                    f[neighbor] = g[neighbor] + h(neighbor);
                }
            }
            return [];
        },
    }
})();
