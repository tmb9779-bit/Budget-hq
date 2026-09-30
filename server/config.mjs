import {homedir} from 'node:os';
import {join} from 'node:path';
// Reuses only the existing local owner password. No Google/Plaid credentials are read.
export const configDir=join(process.env.BUDGET_HQ_DATA_HOME||process.env.LOCALAPPDATA||join(homedir(),'.config'),'BudgetHQ');
export const dataDir=join(configDir,'independent');
// One time zone for every date decision (today, paydays, due dates, the 6 AM bank sync).
// Set BUDGET_HQ_TIMEZONE (an IANA name such as America/New_York) to override.
function validZone(zone){try{new Intl.DateTimeFormat('en-US',{timeZone:zone});return true;}catch{return false;}}
export const timeZone=validZone(process.env.BUDGET_HQ_TIMEZONE)&&process.env.BUDGET_HQ_TIMEZONE?process.env.BUDGET_HQ_TIMEZONE:'America/Chicago';
// Folder names inside configDir that hold your saved budget and bank connection.
// These names must never change between releases: a renamed folder would make the app start with an empty budget.
export const storeNames=Object.freeze({budget:'clean-budget-0918',plaid:'clean-plaid-0918',sampleBudget:'reference-sample',samplePlaid:'plaid-sample'});
// The local web address is http://localhost:<port>. 4173 unless BUDGET_HQ_PORT is set (used by tests).
export const port=Number.isInteger(Number(process.env.BUDGET_HQ_PORT))&&Number(process.env.BUDGET_HQ_PORT)>0?Number(process.env.BUDGET_HQ_PORT):4173;
