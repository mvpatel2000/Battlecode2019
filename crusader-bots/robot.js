import {BCAbstractRobot, SPECS} from 'battlecode';
import {Crusader} from './crusader';
import {Castle} from './castle';
import {Pilgrim} from './pilgrim';
import {Church} from './church';
import {Preacher} from './preacher';
import {Prophet} from './prophet';
import {Algorithms} from './algorithms';

'use strict';

class MyRobot extends BCAbstractRobot {
    turn() {
        for (let i in Algorithms) {
            this[i] = Algorithms[i];
        }
        if (this.me.unit === SPECS.CRUSADER) {
            Crusader.call(this);
        } else if (this.me.unit === SPECS.CASTLE) {
            Castle.call(this);
        } else if (this.me.unit === SPECS.PILGRIM) {
            Pilgrim.call(this);
        } else if (this.me.unit === SPECS.CHURCH) {
            Church.call(this);
        } else if (this.me.unit === SPECS.PREACHER) {
            Preacher.call(this);
        } else if (this.me.unit === SPECS.PROPHET) {
            Prophet.call(this);
        }
        return this.turn();
    }
}
