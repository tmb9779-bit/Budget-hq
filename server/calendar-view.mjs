import {eventsFor,incomeEvents,summary,today} from './model.mjs';
// Both calendar and forecast come from one book and one as-of date.
export function calendarView(book,start,end,asOf=today(),forecastSummary=summary(book,asOf)){
 return {events:eventsFor(book,start,end,asOf),income:incomeEvents(book,start,end,asOf),predictedEvents:eventsFor(book,start,end,asOf,{includePaid:true}),forecast:forecastSummary.plan.forecast,forecastEvents:forecastSummary.upcoming,forecastIncome:forecastSummary.nextPaychecks,asOf};
}
