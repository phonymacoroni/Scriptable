// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// always-run-in-app: true; icon-color: purple;
// icon-glyph: stream; share-sheet-inputs: plain-text;
/*
This script is an action extension that expects to receive a project, task or task group shared from OmniFocus.
The source can contain variables and the script will prompt or use built-in values. Finally the resultant project is
sent back to OmniFocus with the values expanded.

The first line (e.g. the project name) must contain some special text enclosed in <<...>> e.g:

    My Template Project<<Folder>>

Folder is the name of the folder into which the final project will be placed. No folder path is necessary,
"inbox" or "projects" may be used.

Variable usage in the template project is of the form:

${VARNAME}

The script will pop up a dialog asking for the value when it runs.

Special variables that are filled automatically are:

- ${DATE} - 03 October 2018
- ${TIME} - 08:44
- ${DAY} - Saturday
- ${MONTH} - November
- ${HERE} - current address

Tips:

- You can leave your template project template paused in OmniFocus to avoid clutter, the expanded project will be active.
- Add taskpaper directives to the end of a line like @due(+1d).
- Make tags a variable with @tags(${TAG})

If the script is run directly from Scriptable (i.e. with no shared template as input) it will use a test template that is put
into the root OmniFocus projects.
*/


/*
TODO
- handle pre-defined variables like workflow:
  HERE not getting address yet
- tidy, comments and license
*/

// Whole bunch of little date formatting functions
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function getYear(d) { return d.getFullYear(); }
function getMonth(d) { return ("0" + (d.getMonth()+1)).slice(-2); }
function getDate(d) { return ("0" + d.getDate()).slice(-2); }
function getHHMM(d) { return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
function getDayName(d) { return WEEKDAYS[d.getDay()]; }
function getMonthName(d) { return MONTHS[d.getMonth()]; }

// Date formatting for display
function formatNiceDateTime(d) { return getDayName(d) + ' ' + getDate(d) + ' ' + getMonthName(d) + ' ' + getHHMM(d); }
function formatNiceDate(d) { return getDate(d) + ' ' + getMonthName(d) + ' ' + getYear(d); }

// Date formatting for OmniFocus parsing
function formatOFDateTime(d) {return getYear(d) + '-' + getMonth(d) + '-' + getDate(d) + ' ' + getHHMM(d);}
function formatOFDate(d) {return getYear(d) + '-' + getMonth(d) + '-' + getDate(d);}

function processLine(line, variables) {
    let variableNames = Object.keys(variables);
    for (let i = 0; i < variableNames.length; i++) {
        let variableName = variableNames[i];
        let variable = '${' + variableName + '}';
        line = line.replace(variable, variables[variableName]);
    }
    return line;
}
    
function extractProject(line) {
    let pattern = /.*<<(.*)>>.*/;
    let match = pattern.exec(line);
    return match.length >= 2 ? match[1] : null;
}

function extractVariables(text) {
    let textOnOneLine = text.split('\n').join('');
    let varMap = {};
    let pattern = /\$\{([^}]*)\}/g;
    let match = pattern.exec(textOnOneLine);
    while (match) {
        let variable = match[1];
        varMap[variable] = variable;
        match = pattern.exec(textOnOneLine);
    }
    let variables = Object.keys(varMap);
    variables.sort();
    return variables;
}

async function getVariableValues(variableNames) {
    let variables = {};
    for (let i = 0; i < variableNames.length; i++) {
        let variableName = variableNames[i];
        
        if ('DATE' === variableName) {
            let value = formatNiceDate(new Date());
            variables[variableName] = value;
        } else if ('TIME' === variableName) {
            let value = getHHMM(new Date());
            variables[variableName] = value;
        } else if ('DAY' === variableName) {
            let value = getDayName(new Date());
            variables[variableName] = value;
        } else if ('MONTH' === variableName) {
            let value = getMonthName(new Date());
            variables[variableName] = value;
        } else if ('HERE' === variableName) {
            let promise = Location.current();
            console.log('Fetching location, please wait...');
            let location = await promise;
            // returns {"verticalAccuracy":4,"longitude":-2.5946741178655945,"latitude":51.47271370985682,"horizontalAccuracy":10,"altitude":45.898406982421875}
            // TODO lookup address? https://talk.automators.fm/t/get-address-from-location-object/3332
            let value = '(' + location.latitude + ',' + location.longitude + ')';
            variables[variableName] = value;
        } else {
            let alert = new Alert();
            alert.message = variableName;
            alert.addTextField('value')
            alert.addAction('OK');
            let promise = alert.presentAlert();
            await promise;
            let value = alert.textFieldValue(0);
            variables[variableName] = value;
        }
    }
    return variables;
}

function handleErr(val) {
    console.error(val);
}

// Create an Omnifocus entry
function createEntry(project, taskpaper) {
    let url = new CallbackURL('omnifocus://x-callback-url/paste');
    url.addParameter('target', project);
    url.addParameter('content', taskpaper);

    // Confirmation alert
    let alert = new Alert();
    alert.title = 'Expand OmniFocus Template';
    alert.message = 'To ' + project;
    alert.addAction('OK');
    alert.addCancelAction('Cancel');
    alert.present().then((selId) => {
        if (selId === 0) {
            console.log(url.getURL())
            url.open();
        }
    }, handleErr);
}

function expand(text) {
    let variableNames = extractVariables(text);
    console.log('variable names: ' + variableNames);
    getVariableValues(variableNames).then((variables) => {
        console.log(variables);
        let lines = text.split('\n');
        if (lines.length >= 2) {
            let project = extractProject(lines[0]);
            console.log('project: ' + project);
            if (project) {
                let buffer = '';
                let firstLine = lines[0].replace(/<<.*>>/, '');
                buffer += processLine(firstLine, variables) + '\n';
                for(let i = 1; i < lines.length; i++) {
                    buffer += processLine(lines[i], variables) + '\n';
                }
                
                console.log(buffer);
                createEntry(project, buffer)
            }
        }
    });
}

if (args && args.plainTexts.length > 0) {
    expand(args.plainTexts[0]);
} else {
    expand(
        '- Test Template<<projects>> @parallel(true) @autodone(true)\n' + 
        '	- This is a test of expansion. It uses all built in variables @parallel(true) @autodone(false)\n' +
        '		${VAR}\n' + 
        '		\n' +
        '		${DATE}\n' +
        '		\n' +
        '		${TIME}\n' +
        '		\n' +
        '		${DAY}\n' +
        '		\n' +
        '		${MONTH}\n' + 
        '		\n' +
        '		${HERE}\n'
    );
}
