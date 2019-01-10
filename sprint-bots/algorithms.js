import {SPECS} from 'battlecode';

export const Algorithms = (function() {
    function dist(a, b) {
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

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
     * given a squared radius
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
     * given a squared radius, current x position, current y position
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

        occupied: function(x, y) {
            try {
                return !this.map[y][x] || this.getVisibleRobotMap()[y][x] != 0;
            } catch (e) {
                return true;
            }
        },

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

        },

        /**
         * Takes in destination [x, y].
         * Return a list of [dx, dy] instructions to get from current location to destination.
         */
        path: function(dest) {
            let start = [this.me.x, this.me.y];
            let map = this.map;
            let occupied = this.getVisibleRobotMap();
            let empty = map.map((c, i) => c.map((v, j) => v && occupied[i][j] <= 0));
            if (!empty[dest[1]][dest[0]]) {
                return [];
            }
            let openSet = [start];
            let closedSet = [];
            let cameFrom = {};
            let h = x => dist(dest, x);
            let graph = [];
            for (let i = 0; i < empty.length; i++)
                for (let j = 0; j < empty[0].length; j++) {
                    if (empty[i][j])
                        graph.push([j, i]);
                }
            graph.push(start);
            let g = {};
            for (let i of graph) {
                g[i] = Infinity;
            }
            g[start] = 0;
            let f = {};
            for (let i of graph) {
                f[i] = Infinity;
            }
            f[start] = h(start);
            while (openSet.length) {
                let current = openSet.reduce((x, y) => f[x] < f[y] ? x : y);
                if (arrEq(current, dest)) {
                    let totalPath = [current];
                    while (current in cameFrom) {
                        current = cameFrom[current];
                        totalPath.push(current);
                    }
                    let path = [];
                    for (let i = 1; i < totalPath.length; i++) {
                        let [a, b] = totalPath[i];
                        let [c, d] = totalPath[i - 1];
                        path.push([c - a, d - b]);
                    }
                    path.reverse();
                    return path;
                }
                openSet.splice(openSet.indexOf(current), 1);
                closedSet.push(current);
                for (let neighbor of absoluteMoves(getSpeed.call(this), current[0], current[1])) {
                    if (!(containsCoordinate(neighbor, graph)) || containsCoordinate(neighbor, closedSet))
                        continue;
                    let tg = g[current] + dist(current, neighbor);
                    if (!(neighbor in openSet))
                        openSet.push(neighbor);
                    else if (tg >= g[neighbor])
                        continue;
                    cameFrom[neighbor] = current;
                    g[neighbor] = tg;
                    f[neighbor] = g[neighbor] + h(neighbor);
                }
            }
            return [];
        },
    }
})();
