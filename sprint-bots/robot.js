import {BCAbstractRobot, SPECS} from 'battlecode';
import {Crusader} from './crusader';
import {Castle} from './castle';
import {Pilgrim} from './pilgrim';
import {Church} from './church';
import {Preacher} from './preacher';
import {Prophet} from './prophet';

class MyRobot extends BCAbstractRobot {
    turn() {
        if (this.me.unit === SPECS.CRUSADER) {
            Crusader.call(this);
            this.turn();
        } else if (this.me.unit === SPECS.CASTLE) {
            Castle.call(this);
            this.turn();
        } else if (this.me.unit === SPECS.PILGRIM) {
            Pilgrim.call(this);
            this.turn();
        } else if (this.me.unit === SPECS.CHURCH) {
            Church.call(this);
            this.turn();
        } else if (this.me.unit === SPECS.PREACHER) {
            Preacher.call(this);
            this.turn();
        } else if (this.me.unit === SPECS.PROPHET) {
            Prophet.call(this);
            this.turn();
        }
    }
}

