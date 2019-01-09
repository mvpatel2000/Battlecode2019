export const Algorithms = (function() {
    return {
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
                        pos.push([i, j]);
                }
            }
            return pos[Math.floor(Math.random() * pos.length)];
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
            return this.move(...choice);
        },
        path: function(robot, dest) {
            // TODO: implement
        },
    }
})();

