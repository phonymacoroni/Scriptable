// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: teal; icon-glyph: magic;
// Example match value: 'Home,Weekday,Fri,am,Morning,09'
// The first match is used
const RULES = [

{title: 'Before Work',
match: 'Home,Weekday,.*,.*,(Early|Morning),.*',
shortcuts: ['Take Coat']},

{title: '???',
match: '.*,.*,Fri,.*,.*,.*',
shortcuts: ['Take Coat2']},

// Default rule
{title: 'Default',
match: '.*',
shortcuts: ['Fall Through']}
];
    
const CONTEXTS = {
    'BS7' : 'Home'
};

const DEFAULT_CONTEXT = "Out";

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DAY_TYPE = ['Weekend', 'Weekday', 'Weekday', 'Weekday', 'Weekday', 'Weekday', 'Weekend'];

const HOUR_TYPE = {
    '00':'Late',
    '01':'Night',
    '02':'Night',
    '03':'Night',
    '04':'Night',
    '05':'Early',
    '06':'Early',
    '07':'Early',
    '08':'Early',
    '09':'Morning',
    '10':'Morning',
    '11':'Morning',
    '12':'Lunchtime',
    '13':'Afternoon',
    '14':'Afternoon',
    '15':'Afternoon',
    '16':'Afternoon',
    '17':'Afternoon',
    '18':'Evening',
    '19':'Evening',
    '20':'Evening',
    '21':'Evening',
    '22':'Late',
    '23':'Late'
};

async function getShortPostcode() {
    console.log('Getting Location...');
    let location = await Location.current();
    console.log('Getting Address...');
    let address = await Location.reverseGeocode(location.latitude, location.longitude);
    let postcode = address[0].postalCode;
    let shortPostcode = postcode.split(' ')[0];
    console.log(shortPostcode);
    return shortPostcode;
}

async function getPlace() {
    let shortPostcode = await getShortPostcode();
    let place = CONTEXTS[shortPostcode];
    if (!place) {
        place = DEFAULT_CONTEXT;
    }
    return place;
}

function getTime() {
	 let date = new Date();
	 let day = DAYS[date.getDay()];
	 let dayType = DAY_TYPE[date.getDay()];
	 let hour = '' + date.getHours();
    hour = hour.length === 1 ? '0' + hour : hour;
    let hourType = HOUR_TYPE[hour];
	 let amPm = hour < 12 ? 'am' : 'pm';
    return dayType + ',' + day + ',' + amPm + ',' + hourType + ',' + hour;
}

function getRule(key) {
    let rule = null;

    for (let i = 0; i < RULES.length; i++) {
        let match = key.match(RULES[i].match);
        if (match) {
            rule = RULES[i];
            break;
        }
    }
    return rule;
}

function getShortcutsKey() {
    //let context = await getPlace();
    //console.log(context);
    let context = 'Home';
    let time = getTime();
    let key = context + ',' + time;
    return key;
}

let key = getShortcutsKey();
console.log(key);
let rule = getRule(key);

let table = new UITable();
let titleRow = new UITableRow();
titleRow.addText(rule.title);
titleRow.isHeader = true;
titleRow.dismissOnSelect = false;
table.addRow(titleRow);

let shortcuts = rule.shortcuts;
for (let i = 0; i < shortcuts.length; i++) {
    let shortcut = shortcuts[i];
    let row = new UITableRow();
    row.dismissOnSelect = false;
    let cell = row.addText(shortcut);
    row.onSelect = (selIndex) => {
        console.log('run ' + shortcut);
        let url = new CallbackURL('shortcuts://run-shortcut');
        url.addParameter('name', shortcut);
        url.open();
    };
    table.addRow(row);
}

table.present();

// todo cache location or ask
// pass location in from NFC