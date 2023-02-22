const STRING_MALE = "Male";
const STRING_FEMALE = "Female";
const STRING_AGE_0 = "0-10";
const STRING_AGE_1 = "11-20";
const STRING_AGE_2 = "21-40";
const STRING_AGE_3 = "41-60";
const STRING_AGE_4 = "61-80";
const STRING_AGE_5 = "> 80";
const COLOR_MALE = getComputedStyle(document.body).getPropertyValue('--male');
const COLOR_FEMALE = getComputedStyle(document.body).getPropertyValue('--female');
const COLOR_BARS = getComputedStyle(document.body).getPropertyValue('--bars');
const COLOR_PUMP = getComputedStyle(document.body).getPropertyValue('--pump');

const multiplier = 50;
const offsetDataX = 0;
const offsetDataY = 1000;
const svg = d3.select("#svg");
const map = svg.append('g').attr('class', 'container');
const tooltip = document.getElementById("tooltip");
const rangeTooltip = document.getElementById("rangeTooltip");

let slider;
let rangeEnabled = false;

const xCoords = [];
const yCoords = [];

let gridW = 0;
let gridH = 0;
let gridCount = 5;

let dataStreets =[];
let dataLabels = [];
let dataPumps = [];
let dataDeathsByDemo = [];
let dataDeathsByDay = [];
let dataGrid = [];
const dataDeaths = [];

document.addEventListener("DOMContentLoaded", (e) => {
    loadData();
});

const onMouseOver = function(e) {
    let html = "";
    if (e.target.dataset.type) {
        if (e.target.dataset.type === "Pump") {
            tooltip.style.background = getComputedStyle(document.body).getPropertyValue(`--${e.target.dataset.type.toLocaleLowerCase()}`);
            html = e.target.dataset.type;
        } else if (e.target.dataset.type === "Death") {
            tooltip.style.background = getComputedStyle(document.body).getPropertyValue(`--${e.target.dataset.gender.toLocaleLowerCase()}`);
            html = `${e.target.dataset.gender}, aged ${e.target.dataset.age}, died ${e.target.dataset.date}`;
        } else if (e.target.dataset.type === "Bar") {
            tooltip.style.background = COLOR_BARS;
            html = `${e.target.dataset.date}, ${e.target.dataset.deaths} death${parseInt(e.target.dataset.deaths) === 1 ? `` : `s`}`;
        } else if (e.target.dataset.type === "Grid") {
            tooltip.style.background = COLOR_BARS;
            const deaths = Array.from(document.querySelectorAll(`.death[data-grid=${e.target.dataset.grid}].show`));
            html = `${deaths.length} death${deaths.length === 1 ? `` : `s`}`;
            deaths.forEach(d => d.classList.add("hover"));
        }
    }
    tooltip.style.opacity = 1;
    tooltip.innerHTML = html;
}

const onMouseLeave = function(e) {
    tooltip.style.opacity = 0;
    tooltip.innerHTML = "";
    if (e.target.dataset.type === "Grid") {
        Array.from(document.querySelectorAll(`.death.hover`)).forEach(d => d.classList.remove("hover"));
    }
}

const onZoom = (e) => map.attr('transform', e.transform);

const onMouseMove = (e) => {
    if (tooltip.innerText) {
        const x = e.pageX + 20;
        const y = e.pageY + 10;
        tooltip.style.transform = `translate(${x}px, ${y}px)`
    }
};

const onMouseClick = (e) => {
    // if (e.target.dataset.type === "Bar") {
    //     const range = [0, parseInt(e.target.dataset.step)];
    //     slider.value(range);
    //     fireUpdate(range);
    // }
}

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
    const aboutPage = fetch('/about.html').then(resp => resp.text()).then(html => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        document.getElementById("about").append(doc.getElementById("content"));
    });

    Promise.all([streets, labels, pumps, deathsByDemo, deathsDays, aboutPage]).then(v => {
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
    setupSettings();
    document.addEventListener("mousemove", (e) => onMouseMove(e));
}



function setupDrawers() {
    const drawers = Array.from(document.querySelectorAll("#drawers .drawer"));
    const drawerOpen = Array.from(document.querySelectorAll(".open"));
    const drawerClose = Array.from(document.querySelectorAll(".close"));
    drawerOpen.forEach(b => {
        b.addEventListener("click", (e) => {
            e.preventDefault();
            drawers.forEach(d => d.classList.remove("active"));
            document.getElementById(b.id.replace("btn", "").toLocaleLowerCase()).classList.add("active");
        });
        // b.addEventListener("mouseover", (e) => onMouseOver(e));
        // b.addEventListener("mouseleave", (e) => onMouseLeave(e));
    });
    drawerClose.forEach(b => b.addEventListener("click", () => drawers.forEach(d => d.classList.remove("active"))));
}

function setupSettings() {
    const settingChk = Array.from(document.querySelectorAll("#settings input[type=checkbox]"));
    settingChk.forEach(s => {
        s.addEventListener('change', (e) => {
            const checked = e.target.checked;
            const clazz = `${e.target.id}--hide`;
            const items = Array.from(document.querySelectorAll(`#svg .${e.target.id}`));
            items.forEach(item => checked ? item.classList.remove(clazz) : item.classList.add(clazz));
        });
    })
    const filterRdo = Array.from(document.querySelectorAll("#settings input[type=radio]"));
    filterRdo.forEach(r => {
        r.addEventListener('click', (e) => {
            document.body.removeAttribute("style");
            if (e.target.value != "none") {
                document.body.style.filter = `url('/img/filters.svg#${e.target.value}')`;
                document.body.style.overflow = "hidden";
            }
        });
    });
}

function setupSVG() {
    setupZoom();
    setupMap();
    setupGrid();
    setupDeaths();
    setupPumps();
    setupMapCharts();
    setupLegend();
    setupSlider();
}

function setupZoom() {
    const zoom = d3.zoom();
    svg.call(zoom.on("zoom", (e) => onZoom(e)));
    // svg.call(zoom.transform, d3.zoomIdentity.translate(-671,-342).scale(2))
}

function setupMap() {

    // snow's map
    const sg = map.append("g").attr("class", "snowmap snowmap--hide")
    sg.append("image")
        .attr("href", "/img/snowmap.png")
        .attr("width", 826)
        .attr("height", 774)
        .attr("x", 165)
        .attr("y", 110)

    // streets
    const g = map.append("g").attr("class", "streets");
    dataStreets.map(street => {
        const streetsX = street.map(s => s.x * multiplier + offsetDataX);
        const streetsY = street.map(s => ((1 - s.y) * multiplier + offsetDataY)); // flip vertically
        const line = d3.line()
            .x(d => streetsX[d])
            .y(d => streetsY[d]);
        g.append("path")
            .datum(d3.range(streetsX.length))
            .attr("class", "street")
            .attr("d", line);
        streetsX.forEach(s => xCoords.push(s));
        streetsY.forEach(s => yCoords.push(s));
    });

    // labels
    const lg = map.append("g").attr("class", "labels")
    dataLabels.map(l => {
        const llg = lg.append("g").attr("style", `transform:rotate(${l.rotate}deg)`);
        llg.append("text")
            .attr("x", l.x)
            .attr("y", l.y)
            .html(l.name)
            .attr("class", "label")
            .attr("style", `letter-spacing:${l.spacing}px;font-size:${l.size}px`)
    });

}

function setupPumps() {
    const g = map.insert("g", ".grid").attr("class", "pumps");
    dataPumps.map(d => {
        const symbol = d3.symbol().type(d3.symbolTriangle).size(24);
        g.append("path")
            .attr("data-type", "Pump")
            .attr("d", symbol)
            .attr("transform", `translate(${(d.x) * multiplier + offsetDataX}, ${(1 - d.y) * multiplier + offsetDataY})`)
            .attr("class", `pump`)
            .on("mouseover", onMouseOver)
            .on("mouseleave", onMouseLeave)
    });
}

function setupDeaths() {
    const g = map.insert("g", ".grid").attr("class", "deaths");
    dataDeaths.map(d => {
        let gender;
        if (parseInt(d.gender)) {
            gender = STRING_FEMALE;
        } else {
            gender = STRING_MALE;
        }
        let age;
        const aVal = d.age;
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
                ages["0"]++;
                break;
        }

        const x = (d.x) * multiplier + offsetDataX;
        const y = (1 - d.y) * multiplier + offsetDataY;
        let grid;
        dataGrid.forEach(dg => {
            if (x >= dg.left && 
                x <= dg.right &&
                y >= dg.top &&
                y <= dg.bottom) {
                    grid = dg.grid;
            }
        });
        g.append("circle")
            .attr("data-type", "Death")
            .attr("data-age", age)
            .attr("data-gender", gender)
            .attr("data-date", d.date)
            .attr("data-step", d.step + 1)
            .attr("data-grid", grid)
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", 1.5)
            .attr("class", `death ${gender.toLocaleLowerCase()} age${d.age}`)
            .on("mouseover", onMouseOver)
            .on("mouseleave", onMouseLeave)
    });
}

function setupGrid() {
    
    const gg = map.append("g").attr("class", "grid grid--hide")
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);
    const width = (maxX - minX) / gridCount;
    const height = (maxY - minY) / gridCount;
    gridW = width;
    gridH = height;
    const grid = [];

    for (let i = 0; i < gridCount; i++) {
        const row = [];
        for (let j = 0; j < gridCount; j++) {
            row.push([minX + j * width, 
                    minY + i * height,
                    minX + (j + 1) * width,
                    minY + (i + 1) * height]);
        }
        grid.push(row);
        for (let j = 0; j < gridCount; j++) {
            const x = grid[i][j][0];
            const y = grid[i][j][1];
            const id = `${String.fromCharCode(96+i+1).toLocaleUpperCase()}${j+1}`;
            const ggg = gg.append("g")
                .attr("class", "box")
            ggg.append("text")
                .attr("x", x + 3)
                .attr("y", y + 10)
                .html(id)
                .attr("class", "id")
            ggg.append("rect")
                .attr("data-type", "Grid")
                .attr("data-grid", id)
                .attr("width", width)
                .attr("height", height)
                .attr("x", x)
                .attr("y", y)
                .on("mouseover", onMouseOver)
                .on("mouseleave", onMouseLeave);
        }
    }
    const boxes = Array.from(document.querySelectorAll(".grid .box rect"));
    dataGrid = boxes.map(b => {
        const rect = b.getBoundingClientRect();
        return {
            grid: b.dataset.grid,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left
        }
    });
}

function setupMapCharts() {
    const xStart = Math.max(...xCoords) + 35;
    const yStart = Math.min(...yCoords);
    const g = map.append("g").attr("class", "charts");
    const gg = g.append("g")
        .attr("id", "genders")
        .attr("transform", `translate(${xStart}, ${yStart})`)
    const ggc = gg.append("g").attr("class", "contain");
    ggc.append("rect")
        .attr("class", "box")
        .attr("width", 180)
        .attr("height", 195)
    ggc.append("text")
        .attr("class", "title")
        .attr("x", 90)
        .attr("y", 25)
        .html("Deaths By Gender");
    gg.append("g")
        .attr("class", "chart")
        .attr("transform", `translate(90, 110)`)
    const ag = g.append("g")
        .attr("id", "ages")
        .attr("transform", `translate(${xStart}, ${yStart + 220})`);
    const agc = ag.append("g").attr("class", "contain");
    agc.append("rect")
        .attr("class", "box")
        .attr("width", 375)
        .attr("height", 215)
    agc.append("text")
        .attr("class", "title")
        .attr("x", 190)
        .attr("y", 25)
        .html("Deaths By Age (in years)");
    ag.append("g")
        .attr("class", "chart")
        .attr("transform", `translate(100, 120)`)
}

function setupLegend() {
    const xStart = Math.min(...xCoords) + 15;
    const yStart = Math.min(...yCoords) + 30;
    const g = map.insert("g", ".grid").attr("class", "legend");
    g.append("rect")
        .attr("class", "box")
        .attr("width", 125)
        .attr("height", 75)
        .attr("x", xStart)
        .attr("y", yStart)
    const lg = g.append("defs")
            .append("linearGradient")
            .attr("id", "genderFill")
        lg.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", COLOR_MALE)
        lg.append("stop")
            .attr("offset", "50%")
            .attr("stop-color", COLOR_MALE)
        lg.append("stop")
            .attr("offset", "50%")
            .attr("stop-color", COLOR_FEMALE)
        lg.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", COLOR_FEMALE)
    g.append("text")
        .html("Death")
        .attr("x", xStart + 45)
        .attr("y", yStart + 30)
    g.append("text")
        .html("Pump")
        .attr("x", xStart + 45)
        .attr("y", yStart + 60)
    g.append("path")
        .attr("d", d3.symbol().type(d3.symbolTriangle).size(128))
        .attr("transform", `translate(${xStart + 25}, ${yStart + 57})`)
        .attr("fill", COLOR_PUMP)
    g.append("path")
        .attr("d", d3.symbol().type(d3.symbolCircle).size(200))
        .attr("transform", `translate(${xStart + 25}, ${yStart + 24})`)
        .attr("fill", "url(#genderFill)")
}

// function setupDayChart() {
//     createLineChart()
// }

function setupSlider() {

    slider = rangeSlider(document.getElementById("rangeSlider"), {
        value: [0, 0],
        max: dataDeathsByDay.length,
        thumbsDisabled: [true, false],
        rangeSlideDisabled: true,
        onInput: (e) => fireUpdate(e)
    });
    
    fireUpdate([0,0]);

    // enableRange();
}

function enableRange() {
    rangeEnabled = true;
    slider.thumbsDisabled([false, false]);
    slider.rangeSlideDisabled(false);
}

function fireUpdate(range) {

    let totalDeaths = dataDeaths.length;

    const sameSteps = range.every((v, i, a) => v === a[0]);
    const zeroSteps = range.reduce((a,b) => a + b) === 0;

    if (zeroSteps) {
        createLineChart(dataDeathsByDay);
        dayZero(dataDeaths);
    } else if (sameSteps) {
        singleDay(range[0])
    } else if (!rangeEnabled) {
        singleDay(range[1])
    } else if (rangeEnabled) {
        multiDay(range);
    }

    function dayZero(deaths) {
        updateMap(0);
        updateDate(`${dateString(dataDeathsByDay[0].date)} – ${dateString(dataDeathsByDay.slice(-1)[0].date)}`);
        updateDeathCount(`${dataDeaths.length} deaths`);
        updatePieChart(deaths);
        updateBarChart(deaths);
    }

    function singleDay(step) {
        totalDeaths = dataDeathsByDay.slice(0, step).map(d => d.deaths).reduce((a, b) => a + b, 0);
        updateMap(step);
        updateDate(dateString(dataDeathsByDay[step - 1].date));
        updateDeathCount(deathString(dataDeathsByDay[step - 1].deaths, totalDeaths));
        updatePieChart(dataDeaths.slice(0, totalDeaths));
        updateBarChart(dataDeaths.slice(0, totalDeaths));
        updateLineChart(step);
        updateTooltip(dataDeathsByDay[step - 1].deaths, dataDeathsByDay[step - 1].date);
    }

    // function multiDay(steps) {
    //     const deaths = dataDeathsByDay.slice(steps[0], steps[1]).map(d => d.deaths).reduce((a, b) => a + b, 0);
    //     const dates = dataDeathsByDay.slice(steps[0], steps[1]).map(d => d.date);
    //     updateMap(step);
    //     updateDate(`${dateString(dates[0])} – ${dateString(dates.slice(-1)[0])}`);
    //     updateDeathCount(deathString(deaths));
    //     updatePieChart(dataDeaths.slice(0, totalDeaths));
    //     updateBarChart(step);
    //     console.log("multiday", dates.slice(-1)[0].date);
    // }

    function deathString(current, total) {
        return `${current} death${current === 1 ? `` : `s`}${total ? `, ${total} total` : ``}`;
    }

    function dateString(val) {
        let date;
        if (val.includes("Aug")) {
            date = `August ${val.replace("-Aug", "")}`
        } else if (val.includes("Sep")) {
            date = `September ${val.replace("-Sep", "")}`
        }
        // date = `${date}, 1854`;
        return date;
    }

    function updateDate(date) {
        document.getElementById("date").innerHTML = date;
    }

    function updateDeathCount(deaths) {
        document.getElementById("deaths").innerHTML = deaths;
    }

    function updateTooltip(deaths, date) {
        const upperThumb = document.querySelector(".range-slider__thumb[data-upper]");
        upperThumb.classList.add("active");
        upperThumb.setAttribute("data-date", `${date}`);
        upperThumb.setAttribute("data-deaths", `${deaths} death${deaths === 1 ? `` : `s`}`);
    }

    function updateMap(step) {
        const items = Array.from(document.querySelectorAll(`#svg .death`));
        items.forEach(item => parseInt(item.dataset.step) <= step || step === 0 ? item.classList.add("show") : item.classList.remove("show"));
    }

    function updatePieChart(deaths) {
        const genders = {m: 0, f: 0};
        deaths.forEach(d => parseInt(d.gender) === 1 ? genders.f++ : genders.m++);
        createPieChart(genders, "Genders");
    }

    function updateBarChart(deaths) {
        const ages = [
            { label: STRING_AGE_0, deaths: 0, fill: "#c90000" },
            { label: STRING_AGE_1, deaths: 0, fill: "#c15200" },
            { label: STRING_AGE_2, deaths: 0, fill: "#af7c00" },
            { label: STRING_AGE_3, deaths: 0, fill: "#939e00" },
            { label: STRING_AGE_4, deaths: 0, fill: "#6cbc18" },
            { label: STRING_AGE_5, deaths: 0, fill: "#00d667" }
        ]
        deaths.forEach(d => ages[parseInt(d.age)].deaths++)
        createBarChart(ages, "Ages");
    }
    
    function updateLineChart(step) { 
        
    }

}

function createLineChart(deaths) {

    const data = deaths.map(d => {
        let date = d.date.split('-');
        date = `${date[1].includes("Aug") ? `08` : `09`}-${date[0]}`
        return {
            date: d3.timeParse("%m-%d")(date),
            deaths: d.deaths
        }
    });

    console.log(data);

    d3.selectAll("#days .chart").remove();

    const buffer = 0;
    const width = document.getElementById("days")?.getBoundingClientRect()?.width - buffer;
    const height = 150;

    const trend = d3.select(`#days`)
                    .append('div')
                    .attr("class", "chart")
                    .append("svg")
                    .attr("width", width)
                    .attr("height", height)
                    .attr("transform", `translate(0, -50)`)
                    .attr("class", "trend");

    const x = d3.scaleTime()
                .range([0, width])
                .domain(d3.extent(data, (d) => d.date))
    
    // trend.append("g")
    //     .attr("class", "axis")
    //     .attr("transform", `translate(0, 0)`)
    //     .call(d3.axisBottom(x))

    const y = d3.scaleLinear()
                .domain([0, d3.max(data, (d) => d.deaths)])
                .range([height, 0]);
              
    trend.append("path")
        .attr("class", "line")
        .datum(data)
        .attr("d", d3.line().x(d => x(d.date)).y(d => y(d.deaths)))

}

function createPieChart(data, id) {

    d3.selectAll(`#${id.toLocaleLowerCase()} .chart path`).remove();

    const size = 150;
    const translate = size / 2;
    const radius = translate - 5;
    const pieVal = d3.pie().value((d) => d[1]);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    const getPieLabel = (key) => {
        switch(key) {
            case "m":
                return STRING_MALE;
            case "f":
                return STRING_FEMALE;
        }
    }

    const getPieColor = (key) => {
        switch(key) {
            case "m":
                return COLOR_MALE;
            case "f":
                return COLOR_FEMALE;
        }
    }

    const pie = d3.select(`#${id.toLocaleLowerCase()} .chart`)
    const filteredData = Object.entries(data).filter(d => d[1] > 0);

    pie.selectAll()
        .data(pieVal(filteredData))
        .enter()
        .append('path')
        .attr('d', arc)	
        .attr('fill', (d) => getPieColor(d.data[0]))
        .attr("class", (d) => getPieLabel(d.data[0]).toLocaleLowerCase())
    
    pie.selectAll()
        .data(pieVal(filteredData))
        .enter()
        .append('text')
        .attr("y", -15)
        .html((d) => {
            return `
                <tspan x="0" dy="10">${getPieLabel(d.data[0])}</tspan>
                <tspan x="0" dy="15" style="font-size:10px;">(${d.data[1]})</tspan>
            `
        })
        .attr("class", "slice")
        .attr('transform', (d) => `translate(${arc.centroid(d)})`)
}

function createBarChart(data, id) {

    d3.selectAll(`#${id.toLocaleLowerCase()} .chart *`).remove();

    const width = 350;
    const height = 150;

    const bars = d3.select(`#${id.toLocaleLowerCase()} .chart`)

    const x = d3.scaleBand()
                .range([0, width])
                .domain(data.map(d => d.label))
                .padding(0.25);

    bars.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(-90, ${height - 80})`)
        .call(d3.axisBottom(x))

    const y = d3.scaleLinear()
                .domain([0, Math.max(...data.map(d => d.deaths))])
                .range([height, 0]);

    // bars.append("g")
    //     .attr("class", "axis")
    //     .attr("transform", `translate(-90, -80)`)
    //     .call(d3.axisLeft(y))
              
    const bar = bars.append("g")
            .attr("class", "bars")
            .attr("transform", "translate(-90, -80)")
            .selectAll("g")
            .data(data)
            .enter()

    bar.append("rect")
        .attr("x", (d) => x(d.label))
        .attr("y", (d) => y(d.deaths))
        .attr("width", x.bandwidth())
        .attr("height", (d) => height - y(d.deaths))
        .attr("class", "bar")
        .attr("fill", (d) => d.fill)
    
    bar.append("text")
        .attr("class", "value")
        .html((d) => d.deaths ? d.deaths : ``)
        .attr("x", (d) => x(d.label))
        .attr("y", (d) => y(d.deaths))
        .attr("transform", `translate(${x.bandwidth() / 2}, 15)`)

}