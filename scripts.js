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
    const filterChk = Array.from(document.querySelectorAll("#filters input[type=checkbox]"));
    filterChk.forEach(f => {
        f.addEventListener('change', (e) => {
            const checked = e.target.checked;
            const clazz = `${e.target.id}--hide`;
            const items = Array.from(document.querySelectorAll(`#svg .${e.target.id}`));
            items.forEach(item => checked ? item.classList.remove(clazz) : item.classList.add(clazz));
        });
    })
    const filterRdo = Array.from(document.querySelectorAll("#filters input[type=radio]"));
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

const onMouseOver = function(e) {
    let html = "";
    if (this.dataset.type) {
        if (this.dataset.type === "Pump") {
            tooltip.style.background = getComputedStyle(document.body).getPropertyValue(`--${this.dataset.type.toLocaleLowerCase()}`);
            html = this.dataset.type;
        } else if (this.dataset.type === "Death") {
            tooltip.style.background = getComputedStyle(document.body).getPropertyValue(`--${this.dataset.gender.toLocaleLowerCase()}`);
            html = `${this.dataset.gender}, aged ${this.dataset.age}, died ${this.dataset.date}`;
        } else if (this.dataset.type === "Bar") {
            tooltip.style.background = COLOR_BARS;
            html = `${this.dataset.date}, ${this.dataset.deaths} death${parseInt(this.dataset.deaths) === 1 ? `` : `s`}`;
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

const onMouseClick = (e) => {
    if (e.target.dataset.type === "Bar") {
        const step = parseInt(e.target.dataset.step);
        slider.value = step;
        fireUpdates(step);
    }
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
    const xCoords = [];
    const yCoords = [];
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

    // const minX = Math.min(...xCoords);
    // const maxX = Math.max(...xCoords);
    // const minY = Math.min(...yCoords);
    // const maxY = Math.max(...yCoords);

    // const gridSize = 10;

    // const distanceX = (maxX - minX) / gridSize;
    // const distanceY = (maxY - minY) / gridSize;

    // let x = 0;
    // let y = 0;

    // console.log("min", minX);

    // const ggrid = svg.selectAll(".container").append("g");

    // for (let i = 0; i <= gridSize; i++) {

    //     if (x === 0) {
    //         x = minX;
    //     } else {
    //         x = x + distanceX;
    //     }
    //     if (y === 0) {
    //         y = minY;
    //     } else {
    //         y = y + distanceY;
    //     }
        
    //     ggrid.append("circle")
    //         .attr("cx", x)
    //         .attr("cy", minY)
    //         .attr("r", 5)
    //     ggrid.append("circle")
    //         .attr("cx", x)
    //         .attr("cy", maxY)
    //         .attr("r", 5)
    //     ggrid.append("circle")
    //         .attr("cx", minX)
    //         .attr("cy", y)
    //         .attr("r", 5)
    //     ggrid.append("circle")
    //         .attr("cx", maxX)
    //         .attr("cy", y)
    //         .attr("r", 5)
    // }

    // console.log("max", maxX);

    // console.log(distanceX, distanceY);

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
        const symbol = d3.symbol().type(d3.symbolTriangle).size(16);
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
        g.append("circle")
            .attr("data-type", "Death")
            .attr("data-age", age)
            .attr("data-gender", gender)
            .attr("data-date", d.date)
            .attr("data-step", d.step + 1)
            .attr("cx", (d.x) * multiplier + offsetDataX)
            .attr("cy", (1 - d.y) * multiplier + offsetDataY)
            .attr("r", 1)
            .attr("class", `death ${gender.toLocaleLowerCase()} age${d.age}`)
            .on("mouseover", onMouseOver)
            .on("mouseleave", onMouseLeave)
    });
}

function setupSlider() {

    slider.max = dataDeathsByDay.length;

    fireUpdates(0);

    slider.addEventListener("input", (e) => fireUpdates(e));

}

function fireUpdates(e) {
    
    let totalDeaths = dataDeaths.length;
    let step;

    if (isNaN(e)) {
        step = parseInt(e.target.value);
    } else {
        step = e;
    }

    if (step > 0) {
        totalDeaths = dataDeathsByDay.slice(0, step).map(d => d.deaths).reduce((a, b) => a + b, 0);
        updateMap(step);
        updateDate(dateString(dataDeathsByDay[step - 1].date));
        updateDeathCount(deathString(dataDeathsByDay[step - 1].deaths, totalDeaths));
        updatePieCharts(dataDeaths.slice(0, totalDeaths));
        updateBarChart(step);
    } else {
        dayZero(dataDeaths);
    }

    function deathString(current, total) {
        return `${current} death${current === 1 ? `` : `s`}, ${total} total`;
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

    function updateMap(step) {
        const items = Array.from(document.querySelectorAll(`#svg .death`));
        items.forEach(item => parseInt(item.dataset.step) <= step || step === 0 ? item.classList.add("show") : item.classList.remove("show"));
    }

    function updatePieCharts(deaths) {
        const genders = {m: 0, f: 0};
        const ages = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0};

        deaths.forEach(d => {
            if (parseInt(d.gender) === 1) {
                genders.f++;
            } else {
                genders.m++;
            }
            ages[parseInt(d.age)]++;
        });
        d3.selectAll(".content > #genders").remove();
        d3.selectAll(".content > #ages").remove();
        createPieChart(genders, "Genders");
        createPieChart(ages, "Ages");
    }

    function updateBarChart(step) {
        const bars = Array.from(document.querySelectorAll(`#days .bar`));
        bars.forEach(bar => parseInt(bar.dataset.step) === step ? bar.classList.add("active") : bar.classList.remove("active"))
    }

    function dayZero(deaths) {
        updateMap(0);
        updateDate(`${dateString(dataDeathsByDay[0].date)} - ${dateString(dataDeathsByDay.slice(-1)[0].date)}`);
        updateDeathCount(`${dataDeaths.length} deaths`);
        updatePieCharts(deaths);
        createBarChart(dataDeathsByDay);
    }

}

function createBarChart(deaths) {

    d3.selectAll(".content > #days").remove();

    const width = 750;
    const height = 250;

    const bar = d3.select(`#days .content`)
                    .append("svg")
                    .attr("id", "days")
                    .attr("width", width)
                    .attr("height", height)
                    .attr("class", "bars")
                    .append("g");

    const x = d3.scaleBand()
                .range([0, width])
                .domain(deaths.map(d => d.date))
                .padding(0.3);

    const y = d3.scaleLinear()
                .domain([0, Math.max(...deaths.map(d => d.deaths))])
                .range([height, 0]);
              
    bar.selectAll("svg")
        .data(deaths)
        .enter()
        .append("rect")
        .attr("x", (d) => x(d.date))
        .attr("y", (d) => y(d.deaths))
        .attr("width", x.bandwidth())
        .attr("height", (d) => height - y(d.deaths))
        .attr("class", "bar")
        .attr("data-type", "Bar")
        .attr("data-date", (d) => d.date)
        .attr("data-deaths", (d) => d.deaths)
        .attr("data-step", (d, i) => i + 1)
        .on("mouseover", onMouseOver)
        .on("mouseleave", onMouseLeave)
        .on("click", onMouseClick)

}

function createPieChart(data, id) {

    const size = 250;
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

    const getPieColor = (key) => {
        switch(key) {
            case "m":
                return COLOR_MALE;
            case "f":
                return COLOR_FEMALE;
            default:
                return "white";
        }
    }

    const pie = d3.select(`#${id.toLocaleLowerCase()} .content`)
                    .append("svg")
                    .attr("width", size)
                    .attr("height", size)
                    .attr("class", `${id.toLocaleLowerCase()} pie`)
                    .attr("id", id.toLocaleLowerCase())
                    .append("g")
                    .attr("transform", `translate(${translate}, ${translate})`)
    
    const filteredData = Object.entries(data).filter(d => d[1] > 0)

    pie.selectAll()
        .data(pieVal(filteredData))
        .enter()
        .append('path')
        .attr('d', arc)	
        .attr('fill', (d) => getPieColor(d.data[0]))
        // .on("mouseover", onMouseOver)
        // .on("mouseleave", onMouseLeave)
    
    pie.selectAll()
        .data(pieVal(filteredData))
        .enter()
        .append('text')
        .attr("y", -15)
        .html((d) => {
            return `
                <tspan x="0" dy="10">${getPieLabel(d.data[0])}</tspan>
                <tspan x="0" dy="20">(${d.data[1]})</tspan>
            `
        })
        .attr("class", `label ${id.toLocaleLowerCase()}`)
        .attr('transform', (d) => `translate(${arc.centroid(d)})`)
}