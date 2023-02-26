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
const COLOR_AGE_0 = getComputedStyle(document.body).getPropertyValue('--age0');
const COLOR_AGE_1 = getComputedStyle(document.body).getPropertyValue('--age1');
const COLOR_AGE_2 = getComputedStyle(document.body).getPropertyValue('--age2');
const COLOR_AGE_3 = getComputedStyle(document.body).getPropertyValue('--age3');
const COLOR_AGE_4 = getComputedStyle(document.body).getPropertyValue('--age4');
const COLOR_AGE_5 = getComputedStyle(document.body).getPropertyValue('--age5');
const COLOR_DEFAULT = getComputedStyle(document.body).getPropertyValue('--default');
const COLOR_PUMP = getComputedStyle(document.body).getPropertyValue('--pump');

const multiplier = 50;
const offsetDataX = -140;
const offsetDataY = 1010;
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
    if (e.target.dataset.type || e.target.parentNode.dataset.type) {
        if (e.target.dataset.type === "Pump") {
            html = `<div class="pump px-2 py-1 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 43.91s-144 158.3-144 270.3c0 88.36 55.64 144 144 144s144-55.64 144-144c0-112-144-270.3-144-270.3zm16 362.3v-24a60.07 60.07 0 0060-60h24a84.09 84.09 0 01-84 84z"/></svg>
                ${e.target.dataset.type}
            </div>`;
        } else if (e.target.dataset.type === "Death") {
            html = `
                <div class="grid">
                    <div class="px-2 py-1 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 16C141.31 16 48 109.31 48 224v154.83l82 32.81L146.88 496H192v-64h32v64h16v-64h32v64h16v-64h32v64h45.12L382 411.64l82-32.81V224c0-114.69-93.31-208-208-208zm-88 320a56 56 0 1156-56 56.06 56.06 0 01-56 56zm51.51 64L244 320h24l24.49 80zM344 336a56 56 0 1156-56 56.06 56.06 0 01-56 56zm104 32z"/></svg>
                        Died ${e.target.dataset.date}
                    </div>
                    <div class="${e.target.dataset.gender.toLocaleLowerCase()} px-2 py-1 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                            ${e.target.dataset.gender === "Male" ? `<path d="M330 48v44h58.89l-60.39 60.39c-68.2-52.86-167-48-229.54 14.57C31.12 234.81 31.12 345.19 99 413a174.21 174.21 0 00246 0c62.57-62.58 67.43-161.34 14.57-229.54L420 123.11V182h44V48zm-16.08 333.92a130.13 130.13 0 01-183.84 0c-50.69-50.68-50.69-133.16 0-183.84s133.16-50.69 183.84 0 50.69 133.16 0 183.84z"/>` : `<path d="M430 190c0-95.94-78.06-174-174-174S82 94.06 82 190c0 88.49 66.4 161.77 152 172.61V394h-58v44h58v58h44v-58h58v-44h-58v-31.39c85.6-10.84 152-84.12 152-172.61zm-304 0c0-71.68 58.32-130 130-130s130 58.32 130 130-58.32 130-130 130-130-58.32-130-130z"/>`}
                        </svg>
                        ${e.target.dataset.gender}
                    </div>
                    <div class="${e.target.dataset.id} px-2 py-1 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 48C141.13 48 48 141.13 48 256c0 114.69 93.32 208 208 208 114.86 0 208-93.14 208-208 0-114.69-93.31-208-208-208zm108 240H244a4 4 0 01-4-4V116a4 4 0 014-4h24a4 4 0 014 4v140h92a4 4 0 014 4v24a4 4 0 01-4 4z"/></svg>
                        ${e.target.dataset.age} years old
                    </div>
                </div>`
        } else if (e.target.parentNode.dataset.type === "Gender") {
            // html = `<div class="${e.target.parentNode.dataset.gender.toLocaleLowerCase()} px-2 py-1">
            //     Click to Filter Deaths by ${e.target.parentNode.dataset.gender}
            // </div>`;
            const genders = Array.from(document.querySelectorAll(`.death[data-gender=${e.target.parentNode.dataset.gender}].show`));
            genders.forEach(g => g.classList.add("hover", "ghover"));
        } else if (e.target.parentNode.dataset.type === "Age") {
            // html = `<div class="${e.target.parentNode.dataset.id} px-2 py-1">
            //     Click to Filter Deaths by ${e.target.parentNode.dataset.age} years
            // </div>`;
            const ages = Array.from(document.querySelectorAll(`.death[data-id=${e.target.parentNode.dataset.id}].show`));
            ages.forEach(a => a.classList.add("hover", "ahover"));
        } else if (e.target.dataset.type === "Grid") {
            tooltip.style.background = COLOR_DEFAULT;
            const deaths = Array.from(document.querySelectorAll(`.death[data-grid=${e.target.dataset.grid}].show:not(.hide)`));
            html = `<div class="px-2 py-1">${deaths.length} death${deaths.length === 1 ? `` : `s`}</div>`;
            deaths.forEach(d => d.classList.add("hover"));
        }
    }
    tooltip.style.opacity = 1;
    tooltip.innerHTML = html;
}

const onMouseLeave = function(e) {
    tooltip.style.opacity = 0;
    tooltip.innerHTML = "";
    Array.from(document.querySelectorAll(`.death.hover`)).forEach(d => d.classList.remove("hover", "ahover", "ghover"));
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
    if (e.target.parentNode.dataset.type === "Age") {
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
            items.forEach(item => checked ? item.classList.remove(clazz, "hide") : item.classList.add(clazz, "hide"));
        });
    })
    const colorblindRdo = Array.from(document.querySelectorAll("#settings input[name=colorblind]"));
    colorblindRdo.forEach(r => {
        r.addEventListener('click', (e) => {
            document.body.removeAttribute("style");
            if (e.target.value != "none") {
                document.body.style.filter = `url('/img/filters.svg#${e.target.value}')`;
                document.body.style.overflow = "hidden";
            }
        });
    });
    const demographicsRdo = Array.from(document.querySelectorAll("#settings input[name=demographics]"));
    demographicsRdo.forEach(r => {
        r.addEventListener('click', (e) => {
            document.body.removeAttribute("class");
            if (e.target.value != "dnone") {
                document.body.classList.add(e.target.value);
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
        .attr("transform", `translate(${offsetDataX}, ${offsetDataY - 1000})`)

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
        const symbol = d3.symbol().type(d3.symbolTriangle).size(64);
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
            .attr("data-step", d.step)
            .attr("data-grid", grid)
            .attr("data-id", `age${d.age}`)
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
            const id = `${String.fromCharCode(96 + i + 1).toLocaleUpperCase()}${j + 1}`;
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
    const yStart = Math.min(...yCoords) + 15;
    const g = map.append("g").attr("class", "charts");

    // gender
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

    // ages
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

    // days
    const dg = g.append("g")
        .attr("id", "days")
        .attr("transform", `translate(${xStart}, ${yStart + 460})`);
    const dgc = dg.append("g").attr("class", "contain");
    dgc.append("rect")
        .attr("class", "box")
        .attr("width", 500)
        .attr("height", 250)
        dgc.append("text")
        .attr("class", "title")
        .attr("x", 250)
        .attr("y", 25)
        .html("Deaths Per Day");
    dg.append("g")
        .attr("class", "chart trend")
        .attr("transform", `translate(30, 60)`)
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
    // const lg = g.append("defs")
    //         .append("linearGradient")
    //         .attr("id", "genderFill")
    //     lg.append("stop")
    //         .attr("offset", "0%")
    //         .attr("stop-color", COLOR_MALE)
    //     lg.append("stop")
    //         .attr("offset", "50%")
    //         .attr("stop-color", COLOR_MALE)
    //     lg.append("stop")
    //         .attr("offset", "50%")
    //         .attr("stop-color", COLOR_FEMALE)
    //     lg.append("stop")
    //         .attr("offset", "100%")
    //         .attr("stop-color", COLOR_FEMALE)
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
        .attr("fill", COLOR_DEFAULT)
        // .attr("fill", "url(#genderFill)")
}

function setupSlider() {

    createLineChart(dataDeathsByDay);

    delete dataDeathsByDay.columns;
    const min = 0;
    const max = dataDeathsByDay.length;
    const value = [min, max];

    slider = rangeSlider(document.getElementById("rangeSlider"), {
        value: value,
        min: min,
        max: max,
        thumbsDisabled: [false, false],
        rangeSlideDisabled: false,
        onInput: (e) => fireUpdate(e)
    });
    
    fireUpdate(value);

    window.addEventListener("resize", () => {
        fireUpdate(value);
    })
}

function fireUpdate(range) {

    let totalDeaths = dataDeaths.length;

    const steps = Array.from({ length: range[1] - range[0] + 1 }, (_, i) => range[0] + i);
    const deaths = dataDeathsByDay.slice(steps[0], steps.slice(-1)[0]).map(d => d.deaths).reduce((a, b) => a + b, 0);
    const dates = dataDeathsByDay.slice(steps[0], steps.slice(-1)[0]).map(d => d.date);

    if (range[1] - range[0] > 0) {

        let date;
        const start = dates[0];
        const end = dates.slice(-1)[0];
        if (start === end) {
            date = dateString(start)
        } else {
            date = `${dateString(start)} – ${dateString(end)}`
        }
    
        updateMap(steps);
        updateDate(date);
        updateDeathCount(deathString(deaths));
        updatePieChart(dataDeaths.slice(0, deaths));
        updateBarChart(dataDeaths.slice(0, deaths));
        updateLineChart(steps);
    }

    function deathString(current, total) {
        return `${current} death${current === 1 ? `` : `s`}${total ? `, ${total} total` : ``}`;
    }

    function dateString(val) {
        let date;
        if (val?.includes("Aug")) {
            date = `August ${val.replace("-Aug", "")}`
        } else if (val?.includes("Sep")) {
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

    function updateMap(steps) {
        const items = Array.from(document.querySelectorAll(`#svg .death`));
        items.forEach(item => steps.includes(parseInt(item.dataset.step)) ? item.classList.add("show") : item.classList.remove("show"));
    }

    function updatePieChart(deaths) {
        const genders = {m: 0, f: 0};
        deaths.forEach(d => parseInt(d.gender) === 1 ? genders.f++ : genders.m++);
        createPieChart(genders, "Genders");
    }

    function updateBarChart(deaths) {
        const ages = [
            { label: STRING_AGE_0, deaths: 0, id: "age0", fill: COLOR_AGE_0 },
            { label: STRING_AGE_1, deaths: 0, id: "age1", fill: COLOR_AGE_1 },
            { label: STRING_AGE_2, deaths: 0, id: "age2", fill: COLOR_AGE_2 },
            { label: STRING_AGE_3, deaths: 0, id: "age3", fill: COLOR_AGE_3 },
            { label: STRING_AGE_4, deaths: 0, id: "age4", fill: COLOR_AGE_4 },
            { label: STRING_AGE_5, deaths: 0, id: "age5", fill: COLOR_AGE_5 }
        ]
        deaths.forEach(d => ages[parseInt(d.age)].deaths++)
        createBarChart(ages, "Ages");
    }
    
    function updateLineChart(steps) {

        steps.pop();

        const points = Array.from(document.querySelectorAll(".points .point"));
        points.forEach(point => steps.includes(parseInt(point.dataset.step)) ? point.classList.add("show") : point.classList.remove("show"));

        const showPoints = Array.from(document.querySelectorAll(".points .point.show"));
        const firstPoint = showPoints[0];
        const lastPoint = showPoints.slice(-1)[0];
        const xStart = parseInt(firstPoint.getAttribute("cx"));
        const xEnd = parseInt(lastPoint.getAttribute("cx"));

        const flag = d3.select(".trend .flag")
            .attr("class","flag show")

        flag.select("rect")
            .attr("width", xEnd - xStart + 2)
            .attr("transform", `translate(${xStart}, 0)`)

        const firstDate = firstPoint.dataset.date.split("-");
        const lastDate = lastPoint.dataset.date.split("-");

        let dateHtml = `${firstDate[1]} ${firstDate[0]}`;
        if (firstDate[0] !== lastDate[0] || firstDate[1] !== lastDate[1]) {
            dateHtml = `${dateHtml} to ${lastDate[1]} ${lastDate[0]}`
        }

        flag.select(".fdate")
            .attr("transform", `translate(${xStart + 3}, 10)`)
            .html(dateHtml)

        const deathsHtml = deathString(deaths);

        flag.select(".fdeath")
            .attr("transform", `translate(${xStart + 3}, 21)`)
            .html(deathsHtml)

        // const posts = Array.from(document.querySelectorAll(".posts .post"));
        // posts.forEach(post => steps.includes(parseInt(post.dataset.step)) ? post.classList.add("show") : post.classList.remove("show"));

    }

}

function createLineChart(deaths) {

    const data = deaths.map(d => {
        let date = d.date.split('-');
        date = `${date[1].includes("Aug") ? `08` : `09`}-${date[0]}`
        return {
            short: d.date,
            date: d3.timeParse("%m-%d")(date),
            deaths: d.deaths
        }
    });

    d3.selectAll("#days .chart *").remove();

    const width = 440;
    const height = 150;

    const trend = d3.select(`#days .chart`)

    const x = d3.scaleTime()
                .range([0, width])
                .domain(d3.extent(data, (d) => d.date)).nice()

    const y = d3.scaleLinear()
                .domain([0, d3.max(data, (d) => +d.deaths)])
                .range([height, 0]);
    
    trend.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0, 160)`)
        .call(d3.axisBottom(x))

    const lg = trend.append("defs")
            .append("linearGradient")
            .attr("id", "dayFill")
            .attr("x1", "0%")
            .attr("x2", "0%")
            .attr("y1", "100%")
            .attr("y2", "0%")
        lg.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "transparent")
        lg.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", COLOR_DEFAULT)
    
    trend.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", d3.line()
            .x(d => x(d.date))
            .y(d => y(d.deaths)))

    trend.append("path")
        .datum(data)
        .attr("class", "area")
        .attr("d", d3.area()
            .x(d => x(d.date))
            .y0(height)
            .y1(d => y(d.deaths)))

    trend.append("g")
        .attr("class", "points")
        .selectAll()
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "point")
        .attr("r", 2)
        .attr("cx", (d) => x(d.date))
        .attr("cy", (d) => y(d.deaths))
        .attr("data-step", (d, i) => i)
        .attr("data-deaths", (d) => d.deaths)
        .attr("data-date", (d) => d.short)

    trend.append("g")
        .attr("class", "posts")
        .selectAll()
        .data(data)
        .enter()
        .append("line")
        .attr("class", "post")
        .attr("x1", (d) => x(d.date))
        .attr("x2", (d) => x(d.date))
        .attr("y1", (d) => y(d.deaths))
        .attr("y2", (d) => y(d.deaths) - 30)
        .attr("data-step", (d, i) => i)
        .attr("data-deaths", (d) => d.deaths)
        .attr("data-date", (d) => d.short)
    
    const flag = trend.append("g")
        .attr("class", "flag")
        .attr("transform", `translate(-1,-25)`)

    flag.append("rect")
        .attr("width", 50)
        .attr("height", 175)

    flag.append("text")
        .attr("class", "fdate")
        .html("")
        .attr("transform", "translate(3,10)")

    flag.append("text")
        .attr("class", "fdeath")
        .html("")
        .attr("transform", "translate(3,21)")

    // trend.append(flag)

}

function createPieChart(data, id) {

    d3.selectAll(`#${id.toLocaleLowerCase()} .chart *`).remove();

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

    const g = pie.selectAll()
        .data(pieVal(filteredData))
        .enter()
        .append("g")
        .attr("class", "slice")
        .attr("data-type", "Gender")
        .attr("data-gender", (d) => getPieLabel(d.data[0]))
        .attr("data-fill", (d) => getPieColor(d.data[0]))
        .on("mouseover", onMouseOver)
        .on("mouseleave", onMouseLeave)
        .on("click", onMouseClick)
    
    g.append('path')
        .attr('d', arc)	
        .attr('fill', (d) => getPieColor(d.data[0]))
        .attr("class", (d) => getPieLabel(d.data[0]).toLocaleLowerCase())
    
    g.append('text')
        .attr("y", -5)
        .html((d) => getPieLabel(d.data[0]))
        .attr('transform', (d) => `translate(${arc.centroid(d)})`)
    g.append('text')
        .attr("y", 10)
        .html((d) => d.data[1])
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

    const bar = bars.append("g")
            .attr("class", "bars")
            .attr("transform", "translate(-90, -80)")
            .selectAll("g")
            .data(data)
            .enter()

    const g = bar.append("g")
        .attr("data-type", "Age")
        .attr("data-age", (d) => d.label)
        .attr("data-id", (d) => d.id)
        .attr("class", "bar")
        .on("mouseover", onMouseOver)
        .on("mouseleave", onMouseLeave)
        .on("click", onMouseClick)
    
    g.append("rect")
        .attr("x", (d) => x(d.label))
        .attr("y", (d) => y(d.deaths))
        .attr("width", x.bandwidth())
        .attr("height", (d) => height - y(d.deaths))
        .attr("class", (d) => d.id)
        .attr("fill", (d) => d.fill)
    
    g.append("text")
        .attr("class", "value")
        .html((d) => d.deaths ? d.deaths : ``)
        .attr("x", (d) => x(d.label))
        .attr("y", (d) => y(d.deaths))
        .attr("transform", `translate(${x.bandwidth() / 2}, 15)`)

}