// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: orange; icon-glyph: magic-wand;
//
// TODO
// Tidy up
// Attachments

// The default project for creating Omnifocus events
DEFAULT_PROJECT = 'Home: Calendar: Calendar';

// Here you can create mappings so that different calendars create Omnifocus events in different projects
const PROJECT_MAP = {
    'Calendar': 'Work : Calendar',
};

// Some calendars have annoying names, for example my Work exchange calendar is called "Calendar".
// Here you can add translations from the real name to an alternate one that will be used in the UI.
const CALENDAR_TITLE_MAP = {
    'Calendar': 'Work'
};

// Whole bunch of date formatting functions
function getYear(d) {return d.getFullYear();}
function getMonth(d) {return ("0" + (d.getMonth()+1)).slice(-2);}
function getDate(d) {return ("0" + d.getDate()).slice(-2);}
function getHHMM(d) {return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);}
function formatDateTime(d) {return getYear(d) + '-' + getMonth(d) + '-' + getDate(d) + ' ' + getHHMM(d);}
function formatDate(d) {return getYear(d) + '-' + getMonth(d) + '-' + getDate(d);}
function getDayName(d) {var weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];return weekday[d.getDay()];}
function getMonthName(d) {var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];return months[d.getMonth()];}
function formatNiceDateTime(d) {return getDayName(d) + ' ' + getDate(d) + ' ' + getMonthName(d) + ' ' + getHHMM(d);}
function formatNiceDate(d) {return getDayName(d) + ' ' + getDate(d) + ' ' + getMonthName(d);}

// Tidy up a location extracted from the calendar
function locationToSingleLine(locationString) {
    // Put the location on a single line
    return locationString.split('\n').join(', ');
}

// Look up any alternate calendar name
function getAlternateCalendarName(realCalendarName) {
    let newName = CALENDAR_TITLE_MAP[realCalendarName];
    return newName != null ? newName : realCalendarName;
}

// Look up the project to be used for the calendar name
function getProjectFromCalendar(realCalendarName) {
    let project = PROJECT_MAP[realCalendarName];
    return project != null ? project : DEFAULT_PROJECT;
}

// Create an Omnifocus entry
function createEntry(data) {
    let url = new CallbackURL('omnifocus:///add');
    url.addParameter('name', data.name);
    url.addParameter('project', data.project);
    url.addParameter('due', data.due);
    url.addParameter('defer', data.defer);
    url.addParameter('flag', 'true');
    url.addParameter('note', data.note);
    url.addParameter('reveal-new-item', 'false'); // Ignored?, always opened in edit mode in OF
    console.log('Openning ' + url.getURL());
    url.open();
}

// Process an event that has been selected for addition to OmniFocus
function handleSelectedEvent(event) {
    let altCalendarName = getAlternateCalendarName(event.calendar.title);
    let title = event.title;
    let projectForCalendar = getProjectFromCalendar(event.calendar.title);
    let start = formatDate(event.startDate);
    let end = formatDate(event.endDate);
    let singleDay = start === end;
    let location = event.location;
    let note = [
        'Calendar: ' + altCalendarName,
        'Location:',
        location
    ].join('\n');

    if (event.isAllDay && !singleDay) {
        // Multi day event - start day
        createEntry({
        		name: title + ' starts ' + formatNiceDate(event.startDate) + ' - ' + formatNiceDate(event.endDate),
        		project: projectForCalendar,
        		due: start,
        		defer: start,
        		note: note
    		});
        // Multi day event - end day
        createEntry({
        		name: title + ' ends ' + formatNiceDate(event.endDate),
        		project: projectForCalendar,
        		due: end,
        		defer: end,
        		note: note
    		});
    } else if (event.isAllDay) {
        // All day event for a single day
        let due = formatDate(event.startDate);
        let defer = formatDate(event.startDate);
        createEntry({
        		name: title + ' ' + formatNiceDate(event.startDate),
        		project: projectForCalendar,
        		due: due,
        		defer: defer,
        		note: note
    		});
    } else {
        // Simple event with time
        let due = formatDateTime(event.startDate);
        let defer = formatDate(event.startDate);
        createEntry({
        		name: title + ' ' + formatNiceDateTime(event.startDate),
        		project: projectForCalendar,
        		due: due,
        		defer: defer,
        		note: note
    		});
    }
}

// Create a title row (bold text)
function addTitleRow(uiTable, text) {
    let uiTableRow = new UITableRow();
    let titleCell = uiTableRow.addText(text);
    titleCell.widthWeight = 100;
    uiTableRow.height = 40;
    uiTableRow.cellSpacing = 10;
    uiTableRow.dismissOnSelect = false;
    uiTableRow.isHeader = true;
    uiTable.addRow(uiTableRow);
    return uiTableRow;
}

// Create a row for an event
function addRow(uiTable, dateText, eventText) {
    let uiTableRow = new UITableRow();

    // The 15/85 split seems OK on the narrowest ipad split view
    let cell1 = uiTableRow.addText(dateText);
    cell1.widthWeight = 15;
    cell1.leftAligned();

    let cell2 = uiTableRow.addText(eventText);
    cell2.widthWeight = 85;
    cell2.leftAligned();

    uiTableRow.height = 40;
    uiTableRow.cellSpacing = 10;
    uiTableRow.dismissOnSelect = false;
    uiTable.addRow(uiTableRow);
    return uiTableRow;
}

function handleSelectedEvents(events) {
    let uiTable = new UITable();
    let i;
    let lastEventDate = null;
    for (i = 0; i < events.length; i++) {
        let event = events[i];
        let eventDate = formatNiceDate(event.startDate);

        // date
        if (eventDate !== lastEventDate) {
            addTitleRow(uiTable, eventDate);
        }

        // title
        addRow(uiTable, getHHMM(event.startDate), event.title).onSelect = (selIndex) => {
            handleSelectedEvent(event);
        };

        // calendar/
        addRow(uiTable, '', [getAlternateCalendarName(event.calendar.title), locationToSingleLine(event.location)].join(' '));

        lastEventDate = eventDate;
    }
    QuickLook.present(uiTable);
}

function handleErr(val) {
    console.error(val);
}

function handleCalendars(calendars) {
    let now = new Date();
    let future = new Date();
    future.setDate(future.getDate() + 64);
    CalendarEvent.between(now, future, calendars).then(handleSelectedEvents, handleErr);
}

Calendar.forEvents().then(handleCalendars, handleErr);
