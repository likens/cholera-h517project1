const STRING_MALE = "Male";
const STRING_FEMALE = "Female";
const STRING_AGE_0 = "0-10";
const STRING_AGE_1 = "11-20";
const STRING_AGE_2 = "21-40";
const STRING_AGE_3 = "41-60";
const STRING_AGE_4 = "61-80";
const STRING_AGE_5 = "> 80";

const multiplier = 50;
const offsetDataX = 0;
const offsetDataY = 1000;
const svg = d3.select("#svg");
const tooltip = document.getElementById("tooltip");
const slider = document.getElementById("slider");

let dataStreets =[];
let dataLabels = [];
let dataPumps = [];
let dataDeathsByDemo = [];
let dataDeathsByDay = [];
const dataDeaths = [];

const dataGenders = { m: 0, f: 0 };
const dataAges = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0};

let map;

document.addEventListener("DOMContentLoaded", function(event) {

    loadData();

    document.addEventListener("mousemove", (e) => onMouseMove(e));

    const filters = Array.from(document.querySelectorAll("#filters input"));
    filters.forEach(f => {
        f.addEventListener('change', function() {
            const checked = this.checked;
            const clazz = `${this.id}--hide`;
            const items = Array.from(document.querySelectorAll(`#svg .${this.id}`));
            items.forEach(item => checked ? item.classList.remove(clazz) : item.classList.add(clazz));
        });
    })
});

const onMouseOver = function(e) {
    let html;
    if (this.dataset.type === "Pump") {
        html = this.dataset.type;
    } else if (this.dataset.type === "Death") {
        html = `${this.dataset.gender}, aged ${this.dataset.age}, died ${this.dataset.date}`;
    }
    tooltip.style.opacity = 1;
    tooltip.innerHTML = html;
}
const onMouseLeave = function(e) {
    tooltip.style.opacity = 0;
    tooltip.innerHTML = "";
}
const onZoom = (e) => map.attr('transform', e.transform);
const onCreditClick = (href) => {
    if (href.includes('http')) {
        window.open(href);
    } else {
        window.open(`${window.location.href}data/${href}`);
    }
};
const onMouseMove = (e) => tooltip.style.transform = `translate(${e.pageX}px, ${e.pageY}px)`;

function loadData() {
    console.log("loadData");
    const streets = d3.json("/data/streets.json").then(streets => dataStreets = streets);
    const labels = d3.json("/data/labels.json").then(labels => dataLabels = labels);
    const pumps = d3.csv("/data/pumps.csv").then(pumps => dataPumps = pumps);
    const deathsByDemo = d3.csv("/data/deaths_age_sex.csv").then(deaths => dataDeathsByDemo = deaths);
    const deathsDays = d3.csv("/data/deathdays.csv", d => {
        return { 
            date: d.date,
            deaths: parseInt(d.deaths) 
        }
    }).then(deaths => dataDeathsByDay = deaths);

    Promise.all([streets, labels, pumps, deathsByDemo, deathsDays]).then(v => setupSVG());
}

function setupSVG() {

    dataDeathsByDay.forEach((date, idx) => {
        if (date.deaths > 0) {
            const full = dataDeathsByDemo.splice(0, date.deaths).map(death => {
                return {
                    ...death,
                    date: date.date,
                    step: idx
                };
            });
            dataDeaths.push(...full);
        }
    });

    console.log(dataDeathsByDemo);

    map = svg.append('g').attr('class', 'container');
    svg.call(d3.zoom().on("zoom", (e) => onZoom(e)));
    setupStreets();
    setupDeaths();
    setupPumps();
    // setupTimeline();
    setupSlider();
    setupCredits();
}

function setupStreets() {
    const g = map.append("g").attr("class", "streets");
    dataStreets.map(street => {
        const streetXCoords = street.map(s => s.x * multiplier + offsetDataX);
        const streetYCoords = street.map(s => ((1 - s.y) * multiplier + offsetDataY));
        const line = d3.line()
            .x(d => streetXCoords[d])
            .y(d => streetYCoords[d]);
        g.append("path")
            .datum(d3.range(streetXCoords.length))
            .attr("stroke", "black")
            .attr("fill", "none")
            .attr("class", "street")
            .attr("d", line);
    });
    dataLabels.map(l => {
        const lg = g.append("g").attr("style", `transform:rotate(${l.rotate}deg)`);
        lg.append("text")
            .attr("x", l.x)
            .attr("y", l.y)
            .html(l.name)
            .attr("class", "label")
            .attr("style", `letter-spacing:${l.spacing}px;font-size:${l.size}px`)
    });
    const sg = g.append("g").attr("class", "snowmap snowmap--hide")
    sg.append("image")
        .attr("href", "/img/snowmap.png")
        .attr("width", 826)
        .attr("height", 774)
        .attr("x", 165)
        .attr("y", 110)
}

function setupPumps() {
    const g = map.append("g").attr("class", "pumps");
    dataPumps.map(d => {
        g.append("image")
            .attr("href", "/img/pump.svg")
            .attr("data-type", "Pump")
            .attr("x", (d.x) * multiplier + offsetDataX)
            .attr("y", (1 - d.y) * multiplier + offsetDataY)
            .attr("class", "pump")
            .on("mouseover", onMouseOver)
            .on("mouseleave", onMouseLeave)
    });
}

function setupDeaths() {
    const g = map.append("g").attr("class", "deaths");
    dataDeaths.map(d => {
        let gender;
        const gVal = parseInt(d.gender);
        if (gVal) {
            gender = "Female";
            dataGenders.f++;
        } else {
            gender = "Male";
            dataGenders.m++;
        }
        let age;
        const aVal = d.age;
        dataAges[aVal]++;
        switch(aVal) {
            case "0":
                age = "0-10"
                break;
            case "1":
                age = "11-20"
                break;
            case "2":
                age = "21-40"
                break;
            case "3":
                age = "41-60"
                break;
            case "4":
                age = "61-80"
                break;
            case "5":
                age = "> 80"
                break;
            default:
                age = "0-10"
                dataAges["0"]++;
                break;
        }
        g.append("circle")
            .attr("data-type", "Death")
            .attr("data-age", age)
            .attr("data-gender", gender)
            .attr("data-date", d.date)
            .attr("data-step", d.step)
            .attr("cx", (d.x) * multiplier + offsetDataX)
            .attr("cy", (1 - d.y) * multiplier + offsetDataY)
            .attr("r", 2)
            .attr("class", `death ${gender.toLocaleLowerCase()} age${d.age}`)
            .on("mouseover", onMouseOver)
            .on("mouseleave", onMouseLeave)
    });
    setupPieChart(dataGenders, ["steelblue", "hotpink"], "Genders");
    setupPieChart(dataAges, ["white"], "Ages");
}

function setupPieChart(data, swatch, id) {

    const size = 180;
    const translate = size / 2;
    const radius = translate - 5;
    const colors = d3.scaleOrdinal().range(swatch);
    const pieVal = d3.pie().value((d) => d[1]);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    const getPieLabel = (key) => {
        switch(key) {
            case "m":
                return STRING_MALE;
            case "f":
                return STRING_FEMALE;
            case "0":
                return STRING_AGE_0;
            case "1":
                return STRING_AGE_1;
            case "2":
                return STRING_AGE_2;
            case "3":
                return STRING_AGE_3;
            case "4":
                return STRING_AGE_4;
            case "5":
                return STRING_AGE_5;
        }
    }

    const pie = d3.select(`#${id.toLocaleLowerCase()}`)
                    .append("svg")
                    .attr("width", size)
                    .attr("height", size)
                    .attr("class", `${id.toLocaleLowerCase()} pie`)
                    .attr("id", id.toLocaleLowerCase())
                    .append("g")
                    .attr("transform", `translate(${translate}, ${translate})`)
    pie.selectAll()
        .data(pieVal(Object.entries(data)))
        .enter()
        .append('path')
        .attr('d', arc)	
        .attr('fill', (d) => colors(d.data[1]))
    pie.selectAll()
        .data(pieVal(Object.entries(data)))
        .enter()
        .append('text')
        .attr("y", -15)
        .html((d) => {
            return `
                <tspan x="0" dy="15">${getPieLabel(d.data[0])}</tspan>
                <tspan x="0" dy="15">(${d.data[1]})</tspan>
            `
        })
        .attr("class", "label")
        .attr('transform', (d) => `translate(${arc.centroid(d)})`)
}

// function setupTimeline() {

//     const margin = {top: 0, right: 0, bottom: 0, left: 0},
//         width = 460 - margin.left - margin.right,
//         height = 200 - margin.top - margin.bottom;

//     const timeline = d3.select("#charts")
//         .append("svg")
//         .attr("width", width + margin.left + margin.right)
//         .attr("height", height + margin.top + margin.bottom)
//         .append("g")
//         .attr("transform",`translate(${margin.left},${margin.top})`);

//     // console.log(data);

//     const x = d3.scaleLinear().domain(d3.extent(dataDeathsByDay, d => d.date)).range([ 0, width ]);
//     const y = d3.scaleLinear().domain([0, d3.max(dataDeathsByDay, d => +d.deaths)]).range([ height, 0 ]);

//     const axisX = timeline.append("g")
//         .attr("transform", `translate(0,${height})`)
//         .call(d3.axisBottom(x));

//     const axisY = timeline.append("g")
//         .call(d3.axisLeft(y));

//     const area = timeline.append('g')
//         .attr("clip-path", "url(#clip)")

//     const areaGenerator = d3.area()
//         .x((d, i) => i)
//         .y0(y(0))
//         .y1(d => y(d.deaths))

//     area.append("path")
//         .datum(dataDeathsByDay)
//         .attr("class", "myArea")  // I add the class myArea to be able to modify it later on.
//         .attr("fill", "#69b3a2")
//         .attr("fill-opacity", .3)
//         .attr("stroke", "black")
//         .attr("stroke-width", 1)
//         .attr("d", areaGenerator)

//         // const bar = d3.select("#charts")
//         // 			.append("svg")
//         // 			.attr("width", size)
//         // 			.attr("height", size + 20)
//         // 			.attr("class", `${id.toLocaleLowerCase()} pie`)
//         // 			.attr("id", id.toLocaleLowerCase())
//         // 			.append("g")
//         // 			.attr("transform", `translate(${translate}, ${translate + 20})`)

        
// }

function setupSlider() {

    let totalDeaths = dataDeathsByDay[0].deaths;
    slider.max = dataDeathsByDay.length - 1;
    
    updateMap(dataDeathsByDay[0].date);
    updateDate(dateString(dataDeathsByDay[0].date));
    updateDeathCount(deathString(dataDeathsByDay[0].deaths, totalDeaths));
    updateBubble(`${dataDeathsByDay[0].date}`);

    slider.addEventListener("input", (e) => {

        const val = parseInt(e.target.value);
        totalDeaths = dataDeathsByDay.slice(0, val + 1).map(d => d.deaths).reduce((a, b) => a + b, 0);      
        const date = dataDeathsByDay[val].date;
        
        updateMap(val);
        updateDate(dateString(date));
        updateDeathCount(deathString(dataDeathsByDay[val].deaths, totalDeaths));
        updateBubble(`${date}`);

        // const pos = Number(((slider.value - slider.min) * 100) / (slider.max - slider.min));
        // bubble.style.left = `calc(${pos}% + (${10 - pos * 0.15}px))`;

    })

    function deathString(current, total) {
        return `(${current} death${current === 1 ? `` : `s`}, ${total} total)`;
    }

    function dateString(val) {
        let date;
        if (val.includes("Aug")) {
            date = `August ${val.replace("-Aug", "")}`
        } else if (val.includes("Sep")) {
            date = `September ${val.replace("-Sep", "")}`
        }
        date = `${date}, 1854`;
        return date;
    }

    function updateDate(date) {
        document.getElementById("date").innerHTML = date;
    }

    function updateDeathCount(deaths) {
        document.getElementById("deaths").innerHTML = deaths;
    }

    function updateBubble(bubble) {
        document.getElementById("bubble").innerHTML = bubble;
    }

    function updateMap(step) {
        const items = Array.from(document.querySelectorAll(`#svg .death`));
        items.forEach(item => parseInt(item.dataset.step) < step ? item.classList.add("show") : item.classList.remove("show"));
    }

}

function setupCredits() {

    const g = map.append("g").attr("class", "credits");
        
    const credits = [
        { provided: "Street layout", href: "streets.json", x: 190, y: 905 },
        { provided: "Street labels", href: "labels.json", x: 190, y: 920 },
        { provided: "Pump placement", href: "pumps.csv", x: 190, y: 935 },
        { provided: "Death age, gender, and location", href: "deaths_age_sex.csv", x: 190, y: 950 },
        { provided: "Original map from John Snow, 1854", href: "https://en.wikipedia.org/wiki/1854_Broad_Street_cholera_outbreak", x: 190, y: 965 },
    ];

    credits.map(c => {
        g.append("text")
            .attr("x", c.x)
            .attr("y", c.y)
            .html(`${c.provided} provided by ${c.href}`)
            .attr("class", "credit")
            .on("click", () => onCreditClick(c.href))
    });
}