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
const map = svg.append('g').attr('class', 'container');
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

document.addEventListener("DOMContentLoaded", function(event) {

    loadData();

    document.addEventListener("mousemove", (e) => onMouseMove(e));

});

function setupDrawers() {
    const drawers = Array.from(document.querySelectorAll("#drawers .drawer"));
    const drawerOpen = Array.from(document.querySelectorAll(".open"));
    const drawerClose = Array.from(document.querySelectorAll(".close"));
    drawerOpen.forEach(b => {
        b.addEventListener("click", () => {
            drawers.forEach(d => d.classList.remove("active"));
            document.getElementById(b.id.replace("btn", "").toLocaleLowerCase()).classList.add("active");
        });
    });
    drawerClose.forEach(b => b.addEventListener("click", () => drawers.forEach(d => d.classList.remove("active"))));
}

function setupDraggables() {
    const dragElem = Array.from(document.querySelectorAll('.draggies'));
    const draggies = dragElem.map(d => {
        const handle = d.querySelector('.handle');
        const content = d.querySelector('.content');
        const toggle = handle.querySelector('.toggle');
        toggle.addEventListener('click', () => {
            content.classList.toggle('active');
            content.className.includes("active") ? toggle.innerHTML = "-" : toggle.innerHTML = "+";
        });
        const draggie = new Draggabilly(d, {
            containment: '#draggabilly',
            handle: handle
        });
        return draggie;
    });
}

function setupFilters() {
    const filters = Array.from(document.querySelectorAll("#filters input"));
    filters.forEach(f => {
        f.addEventListener('change', (e) => {
            const checked = e.target.checked;
            const clazz = `${e.target.id}--hide`;
            const items = Array.from(document.querySelectorAll(`#svg .${e.target.id}`));
            items.forEach(item => checked ? item.classList.remove(clazz) : item.classList.add(clazz));
        });
    })
}

function setupColorblind() {
    const colorBlindArea = document.querySelector("#colorblind .content .grid");
    const colorBlindFilters = [
        "None",
        "Protanopia",
        "Protanomaly",
        "Deuteranopia",
        "Deuteranomaly",
        "Tritanopia",
        "Tritanomaly",
        "Achromatopsia",
        "Achromatomaly"
    ];

    colorBlindFilters.forEach(c => {
        const id = c.toLocaleLowerCase();
        const lbl = document.createElement("label");
        const input = document.createElement("input");
        const span = document.createElement("span");

        input.type = "radio";
        input.id = id;
        input.value = id;
        input.name = "colorblind";
        input.checked = id === "none";

        span.textContent = c;

        lbl.appendChild(input);
        lbl.appendChild(span);

        lbl.classList.add("flex", "gap-2", "text-sm", "cursor-pointer");

        colorBlindArea.appendChild(lbl);
    });
    
    const options = Array.from(document.querySelectorAll("#colorblind input"));
    options.forEach(o => {
        o.addEventListener('click', (e) => {
            document.body.removeAttribute("style");
            if (e.target.value != "none") {
                document.body.style.filter = `url('/img/filters.svg#${e.target.value}')`;
                document.body.style.overflow = "hidden";
            }
        });
    });
}

const onMouseOver = function(e) {
    let html = "";
    if (this.dataset.type) {
        if (this.dataset.type === "Pump") {
            tooltip.style.background = getComputedStyle(document.body).getPropertyValue(`--${this.dataset.type.toLocaleLowerCase()}`);
            html = this.dataset.type;
        } else if (this.dataset.type === "Death") {
            tooltip.style.background = getComputedStyle(document.body).getPropertyValue(`--${this.dataset.gender.toLocaleLowerCase()}`);
            html = `${this.dataset.gender}, aged ${this.dataset.age}, died ${this.dataset.date}`;
        }
    }
    tooltip.style.opacity = 1;
    tooltip.innerHTML = html;
}
const onMouseLeave = function(e) {
    tooltip.style.opacity = 0;
    tooltip.innerHTML = "";
}
const onZoom = (e) => map.attr('transform', e.transform);
const onMouseMove = (e) => tooltip.style.transform = `translate(${e.pageX}px, ${e.pageY}px)`;

function loadData() {
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

    Promise.all([streets, labels, pumps, deathsByDemo, deathsDays]).then(v => {
        combineData();
        setupLayout();
        setupSVG();
    });
}

function combineData() {
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
}

function setupLayout() {
    setupDrawers();
    setupDraggables();
    setupFilters();
    setupColorblind();
}

function setupSVG() {
    setupZoom();
    setupStreets();
    setupDeaths();
    setupPumps();
    setupSlider();
}

function setupZoom() {
    svg.call(d3.zoom().on("zoom", (e) => onZoom(e)));
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
        const symbol = d3.symbol().type(d3.symbolTriangle).size(40);
        g.append("path")
            .attr("data-type", "Pump")
            .attr("d", symbol)
            .attr("transform", `translate(${(d.x) * multiplier + offsetDataX}, ${(1 - d.y) * multiplier + offsetDataY})`)
            .attr("class", `pump`)
            .on("mouseover", onMouseOver)
            .on("mouseleave", onMouseLeave)

        // g.append("image")
        //     .attr("href", "/img/pump.svg")
        //     .attr("data-type", "Pump")
        //     .attr("x", (d.x) * multiplier + offsetDataX)
        //     .attr("y", (1 - d.y) * multiplier + offsetDataY)
        //     .attr("class", "pump")
        //     .on("mouseover", onMouseOver)
        //     .on("mouseleave", onMouseLeave)
    });
}

function setupDeaths() {
    const g = map.append("g").attr("class", "deaths");
    dataDeaths.map(d => {
        let gender;
        const gVal = parseInt(d.gender);
        if (gVal) {
            gender = STRING_FEMALE;
            dataGenders.f++;
        } else {
            gender = STRING_MALE;
            dataGenders.m++;
        }
        let age;
        const aVal = d.age;
        dataAges[aVal]++;
        switch(aVal) {
            case "0":
                age = STRING_AGE_0
                break;
            case "1":
                age = STRING_AGE_1
                break;
            case "2":
                age = STRING_AGE_2
                break;
            case "3":
                age = STRING_AGE_3
                break;
            case "4":
                age = STRING_AGE_4
                break;
            case "5":
                age = STRING_AGE_5
                break;
            default:
                age = STRING_AGE_0
                dataAges["0"]++;
                break;
        }
        g.append("circle")
            .attr("data-type", "Death")
            .attr("data-age", age)
            .attr("data-gender", gender)
            .attr("data-date", d.date)
            .attr("data-step", d.step + 1)
            .attr("cx", (d.x) * multiplier + offsetDataX)
            .attr("cy", (1 - d.y) * multiplier + offsetDataY)
            .attr("r", 2)
            .attr("class", `death ${gender.toLocaleLowerCase()} age${d.age}`)
            .on("mouseover", onMouseOver)
            .on("mouseleave", onMouseLeave)
    });
    setupPieChart(dataGenders, [getComputedStyle(document.body).getPropertyValue('--male'), getComputedStyle(document.body).getPropertyValue('--female')], "Genders");
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

    const pie = d3.select(`#${id.toLocaleLowerCase()} .content`)
                    .append("svg")
                    .attr("width", size)
                    .attr("height", size)
                    .attr("class", `${id.toLocaleLowerCase()} pie`)
                    .attr("id", id.toLocaleLowerCase())
                    .append("g")
                    .on("mouseover", onMouseOver)
                    .on("mouseleave", onMouseLeave)
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

    let totalDeaths = dataDeaths.length;
    slider.max = dataDeathsByDay.length;

    dayZero();
    // updateBubble(`${dataDeathsByDay[0].date}`);

    slider.addEventListener("input", (e) => {

        const val = parseInt(e.target.value);

        if (val > 0) {
            totalDeaths = dataDeathsByDay.slice(0, val).map(d => d.deaths).reduce((a, b) => a + b, 0);
            updateMap(val);
            updateDate(dateString(dataDeathsByDay[val - 1].date));
            updateDeathCount(deathString(dataDeathsByDay[val - 1].deaths, totalDeaths));
            // updateBubble(`${date}`);
            // const pos = Number(((slider.value - slider.min) * 100) / (slider.max - slider.min));
            // bubble.style.left = `calc(${pos}% + (${10 - pos * 0.15}px))`;
        } else {
            dayZero();
        }

    });
    
    function dayZero() {
        updateMap(0);
        updateDate("");
        updateDeathCount(`Total Deaths: ${dataDeaths.length}`);
    }

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
        items.forEach(item => parseInt(item.dataset.step) <= step || step === 0 ? item.classList.add("show") : item.classList.remove("show"));
    }

}