var unirest = require('unirest');
var moment = require('moment');
var fs = require('fs')

var API_KEY = "9c2dbdc77bmsh7a047233ef3551ep10bea6jsna1a8be0d5d8e"

var origin = {
                "PlaceId":"JFK-sky",
                "PlaceName":"New York John F. Kennedy",
                "CountryId":"US-sky",
                "RegionId":"NY",
                "CityId":"NYCA-sky",
                "CountryName":"United States"
            }

var dest = {
                "PlaceId":"DPS-sky",
                "PlaceName":"Bali (Denpasar)",
                "CountryId":"ID-sky",
                "RegionId":"",
                "CityId":"DPSI-sky",
                "CountryName":"Indonesia"
            }


function createSession(leaveDate, returnDate) {
    var req = unirest("POST", "https://skyscanner-skyscanner-flight-search-v1.p.rapidapi.com/apiservices/pricing/v1.0");

    req.headers({
        "x-rapidapi-host": "skyscanner-skyscanner-flight-search-v1.p.rapidapi.com",
        "x-rapidapi-key": "9c2dbdc77bmsh7a047233ef3551ep10bea6jsna1a8be0d5d8e",
        "content-type": "application/x-www-form-urlencoded"
    });

    req.form({
        "inboundDate": returnDate,
        "cabinClass": "economy",
        "children": "0",
        "infants": "0",
        "country": "US",
        "currency": "USD",
        "locale": "en-US",
        "originPlace": "JFK-sky",
        "destinationPlace": "DPS-sky",
        "outboundDate": leaveDate,
        "adults": "1"
    });
    return new Promise((resolve, reject) => {
        req.end(function (res) {
            if (res.error) return reject(res.error)
            loc = res.headers.location.split('/')
            var ses = loc.pop() || loc.pop;
            resolve(ses)
        });
    })
}

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}
const delay = ms => new Promise(res => setTimeout(res, ms));

function generateDateRanges(earliestLeaveDate, latestLeaveDate, duration, durationFlexibility){
    var dateRanges = []
    var loop = new Date(earliestLeaveDate);
    while(loop <= latestLeaveDate){
        for (var i = duration - durationFlexibility; i <= duration + durationFlexibility; i++){
            var returnDate = loop.addDays(i)
            var dates = {
                "leaveDate": moment(loop).format('YYYY-MM-DD'),
                "returnDate": moment(returnDate).format('YYYY-MM-DD')
            }
            dateRanges.push(dates)
        }
        var newDate = loop.setDate(loop.getDate() + 1);
        loop = new Date(newDate);
    }

    return Promise.resolve(dateRanges)
}

function getSessionResults(sessionkey){
    var req = unirest("GET", "https://skyscanner-skyscanner-flight-search-v1.p.rapidapi.com/apiservices/pricing/uk2/v1.0/" + sessionkey);
    req.query({
        "sortType": "price",
        "sortOrder": "asc",
        "originAirports": "JFK-sky",
        "destinationAirports": "DPS-sky",
        "pageIndex": "0",
        "pageSize": "10"
    });
    
    req.headers({
        "x-rapidapi-host": "skyscanner-skyscanner-flight-search-v1.p.rapidapi.com",
        "x-rapidapi-key": "9c2dbdc77bmsh7a047233ef3551ep10bea6jsna1a8be0d5d8e"
    });

    return new Promise((resolve, reject) => {
        req.end(function (res) {
            if (res.error) return reject(res.error)
            var flight = {
                "price" : res.body.Itineraries[0].PricingOptions[0].Price,
                "link" : res.body.Itineraries[0].PricingOptions[0].DeeplinkUrl
            }
            resolve(flight)
        });
    })

}

async function main() {
    var dates = await generateDateRanges(new Date(2020, 01, 15), new Date(2020, 01, 19), 21, 2)
    var success = false
    for (i = 0; i < dates.length; i++){
        while(!success){
            await createSession(dates[i].leaveDate, dates[i].returnDate)
            .then((session) => {
                dates[i].session = session
                success = true
            })
            .catch((error) => console.log(error))
        }
        success = false
    }
    var data = JSON.stringify(dates)
    fs.writeFileSync('session-data.json', data) 

    success = false
    for (i=0; i < dates.length; i++){
        while(!success){
            await getSessionResults(dates[i].session)
            .then((results) => {
                dates[i].priceData = results
                success = true
            })
            .catch((error) => console.log(error))
        }
        success = false
    }
    data = JSON.stringify(dates)
    fs.writeFileSync('price-data.json', data) 


    
}

main();
//getSessionResults("1774c3c6-6450-4880-a6ea-6605d5c171ec")