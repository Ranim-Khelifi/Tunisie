// Configuration de la carte
const width = 700;
const height = 600;
const svg = d3.select("#map")
    .attr("width", width)
    .attr("height", height);

// Création du groupe pour le contenu zoomable
const g = svg.append("g");

// Projection centrée sur la Tunisie
const projection = d3.geoMercator()
    .scale(3500)
    .center([9, 34])
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

// Définition du comportement de zoom
const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on('zoom', zoomed);

// Application du zoom sur le SVG
svg.call(zoom);

function zoomed(event) {
    g.attr('transform', event.transform);
}

// Création du tooltip
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// URLs des fichiers GeoJSON
const circonscriptionsUrl = "https://raw.githubusercontent.com/Ranim-Khelifi/Tunisie/refs/heads/main/tncirconscriptions.geojson";
const zonesIndustriellesUrl = "https://raw.githubusercontent.com/Ranim-Khelifi/Tunisie/refs/heads/main/zonesindustrielles.geojson";
const collecteGraineUrl = "https://raw.githubusercontent.com/Ranim-Khelifi/Tunisie/refs/heads/main/CollecteGraineBeja.geojson";
const barragesUrl = "https://raw.githubusercontent.com/Ranim-Khelifi/Tunisie/main/barrages_collinaires_beja.geojson";
const lacsUrl = "https://raw.githubusercontent.com/Ranim-Khelifi/Tunisie/main/lacs_collinaires_beja.geojson";
const map3Url = "https://raw.githubusercontent.com/Ranim-Khelifi/Tunisie/refs/heads/main/map3.geojson";
const statsUrl = "https://raw.githubusercontent.com/Ranim-Khelifi/Tunisie/refs/heads/main/man.json";
// Palettes de couleurs
const regionColor = d3.scaleOrdinal(d3.schemePaired);
const zoneColor = "#e41a1c";
const collecteColor = "#00008B";
const barrageColor = "#2E8B57";
const lacColor = "#4682B4";
const map3Color = "#0000ff";

// Chargement des données
Promise.all([
    d3.json(circonscriptionsUrl),
    d3.json(zonesIndustriellesUrl),
    d3.json(collecteGraineUrl),
    d3.json(barragesUrl),
    d3.json(lacsUrl),
    d3.json(map3Url)
]).then(function([circonscriptionsData, zonesData, collecteData, barragesData, lacsData, map3Data]) {
    if (!circonscriptionsData?.features || !zonesData?.features || !collecteData?.features || 
        !barragesData?.features || !lacsData?.features || !map3Data?.features) {
        throw new Error("Données GeoJSON invalides");
    }

    // 1. Afficher les circonscriptions avec leurs noms (MODIFIÉ)
    const polygons = circonscriptionsData.features.filter(d => 
        d.geometry.type === "Polygon" || d.geometry.type === "MultiPolygon");

    const regionNames = [...new Set(polygons.map(d => d.properties.region || "Non spécifié"))];
    regionColor.domain(regionNames);

    const regionGroups = g.selectAll(".region-group")
        .data(polygons)
        .enter().append("g")
        .attr("class", "region-group");

    // Dessiner les polygones
    regionGroups.append("path")
        .attr("class", "region")
        .attr("d", path)
        .attr("fill", d => regionColor(d.properties.region || "Non spécifié"))
        .attr("stroke", "white")
        .attr("stroke-width", 0.5)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("stroke", "#333").attr("stroke-width", 1.5);
            tooltip.transition().duration(200).style("opacity", .9);
            
            // Affiche seulement le nom de la circonscription
            tooltip.html(`<strong>${d.properties.circo_na_1 || ''}</strong>`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("stroke", "white").attr("stroke-width", 0.5);
            tooltip.transition().duration(500).style("opacity", 0);
        });

    // Ajouter les noms des circonscriptions
    regionGroups.append("text")
        .attr("class", "region-label")
        .attr("transform", d => {
            const centroid = path.centroid(d);
            return `translate(${centroid[0]},${centroid[1]})`;
        })
        .attr("text-anchor", "middle")
        .attr("dy", ".35em")
        .text(d => d.properties.circo_na_1 || "")
        .attr("font-size", "8px")
        .attr("fill", "#333")
        .style("pointer-events", "none")
        .style("font-weight", "bold")
        .style("text-shadow", "1px 1px 2px white, -1px -1px 2px white, 1px -1px 2px white, -1px 1px 2px white");

    // 2. Afficher les zones industrielles
    g.selectAll(".zone-industrielle")
        .data(zonesData.features)
        .enter().append("circle")
        .attr("class", "zone-industrielle")
        .attr("cx", d => projection([d.properties.lon, d.properties.lat])[0])
        .attr("cy", d => projection([d.properties.lon, d.properties.lat])[1])
        .attr("r", d => Math.sqrt(parseFloat(d.properties["المساحة (هك)"] || 50)) * 0.3)
        .attr("fill", zoneColor)
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", d => Math.sqrt(parseFloat(d.properties["المساحة (هك)"] || 50)) * 0.5);
            tooltip.transition().duration(200).style("opacity", .9);
            
            tooltip.html(`
                <strong>${d.properties.name}</strong>
                <br>Superficie: ${d.properties["المساحة (هك)"]} hectares
                <br>Gouvernorat: ${d.properties.الولاية}
                <br>Région: ${d.properties.الجهة}
            `)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function(d) {
            d3.select(this).attr("r", d => Math.sqrt(parseFloat(d.properties["المساحة (هك)"] || 50)) * 0.3);
            tooltip.transition().duration(500).style("opacity", 0);
        });

    // 3. Afficher les points de collecte de graines
    g.selectAll(".collecte-point")
        .data(collecteData.features)
        .enter().append("circle")
        .attr("class", "collecte-point")
        .attr("cx", d => projection(d.geometry.coordinates)[0])
        .attr("cy", d => projection(d.geometry.coordinates)[1])
        .attr("r", 5)
        .attr("fill", collecteColor)
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", 8);
            tooltip.transition().duration(200).style("opacity", .9);
            
            tooltip.html(`
                <strong>${d.properties.Name || 'Point de collecte'}</strong>
                ${d.properties.description ? `<br>${d.properties.description}` : ''}
            `)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 5);
            tooltip.transition().duration(500).style("opacity", 0);
        });

    // 4. Afficher les barrages collinaires
    g.selectAll(".barrage-point")
        .data(barragesData.features)
        .enter().append("circle")
        .attr("class", "barrage-point")
        .attr("cx", d => projection(d.geometry.coordinates)[0])
        .attr("cy", d => projection(d.geometry.coordinates)[1])
        .attr("r", 6)
        .attr("fill", barrageColor)
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", 9);
            tooltip.transition().duration(200).style("opacity", .9);
            
            tooltip.html(`
                <strong>${d.properties.Nom_fr || d.properties.name || 'Barrage'}</strong>
                <br>Nom arabe: ${d.properties.Nom_ar || 'Non spécifié'}
                <br>Année de création: ${d.properties.Annee_de_creation || 'Inconnue'}
                <br>Secteur: ${d.properties.Secteur || 'Non spécifié'}
                <br>Délégation: ${d.properties.Delegation || 'Non spécifié'}
                ${d.properties.Apport_mille_m3 ? `<br>Apport: ${d.properties.Apport_mille_m3} mille m³` : ''}
            `)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 6);
            tooltip.transition().duration(500).style("opacity", 0);
        });

    // 5. Afficher les lacs collinaires
    g.selectAll(".lac-point")
        .data(lacsData.features)
        .enter().append("circle")
        .attr("class", "lac-point")
        .attr("cx", d => projection(d.geometry.coordinates)[0])
        .attr("cy", d => projection(d.geometry.coordinates)[1])
        .attr("r", 7)
        .attr("fill", lacColor)
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", 10);
            tooltip.transition().duration(200).style("opacity", .9);
            
            tooltip.html(`
                <strong>${d.properties.name || 'Lac collinaire'}</strong>
                <br>Année de construction: ${d.properties.IHPLC_ANN || 'Inconnue'}
                <br>Capacité: ${d.properties.IHPLC_CAP ? d3.format(",")(d.properties.IHPLC_CAP) + ' m³' : 'Inconnue'}
                <br>Volume actuel: ${d.properties.IHPLC_COU ? d3.format(",")(d.properties.IHPLC_COU) + ' m³' : 'Inconnu'}
                <br>Délégation: ${d.properties.IHPLC_DELE || 'Non spécifié'}
                <br>Secteur: ${d.properties.IHPLC_SECT || 'Non spécifié'}
            `)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 7);
            tooltip.transition().duration(500).style("opacity", 0);
        });

    // 6. Afficher les points de map3.geojson
    g.selectAll(".map3-point")
        .data(map3Data.features)
        .enter().append("circle")
        .attr("class", "map3-point")
        .attr("cx", d => projection(d.geometry.coordinates)[0])
        .attr("cy", d => projection(d.geometry.coordinates)[1])
        .attr("r", 6)
        .attr("fill", d => d.properties["marker-color"] || map3Color)
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", 9);
            tooltip.transition().duration(200).style("opacity", .9);
            
            tooltip.html(`
                <strong>${d.properties["Nom-fr"] || 'Point'}</strong>
                <br>Nom arabe: ${d.properties["Nom-ar"] || 'Non spécifié'}
                ${d.properties["capacité-mille-litre"] ? `<br>Capacité: ${d.properties["capacité-mille-litre"]} mille litres` : ''}
                <br>Délégation: ${d.properties.Delegation || 'Non spécifié'}
                ${d.properties["Date-creation"] ? `<br>Date de création: ${d.properties["Date-creation"]}` : ''}
            `)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 6);
            tooltip.transition().duration(500).style("opacity", 0);
        });

    // 7. Création des légendes
    const legend = d3.select("#legend")
        .style("display", "flex")
        .style("flex-wrap", "wrap")
        .style("gap", "20px");

    /*/// Légende des régions
    const regionLegend = legend.append("div")
        .attr("class", "legend-section");
    
    regionLegend.append("h3").text("Légende des Régions");
    
    const regionItems = regionLegend.selectAll(".legend-item")
        .data(regionNames)
        .enter().append("div")
        .attr("class", "legend-item")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "5px");
    
    regionItems.append("div")
        .attr("class", "legend-color")
        .style("width", "15px")
        .style("height", "15px")
        .style("margin-right", "8px")
        .style("background-color", d => regionColor(d));
    
    regionItems.append("span")
        .text(d => d)
        .style("font-size", "12px");*/

    // Légende des zones industrielles
    const zoneLegend = legend.append("div")
        .attr("class", "legend-section");
    
    zoneLegend.append("h3").text("Légende des Zones Industrielles");
    
    zoneLegend.append("div")
        .attr("class", "legend-item")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "5px")
        .html(`
            <div class="legend-color" style="background-color:${zoneColor};width:15px;height:15px;margin-right:8px;border-radius:50%;"></div>
            <span style="font-size:12px;">Zones Industrielles (taille = superficie)</span>
        `);

    // Légende des points de collecte
    const collecteLegend = legend.append("div")
        .attr("class", "legend-section");
    
    collecteLegend.append("h3").text("Points de Collecte");
    
    collecteLegend.append("div")
        .attr("class", "legend-item")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "5px")
        .html(`
            <div class="legend-color" style="background-color:${collecteColor};width:15px;height:15px;margin-right:8px;border-radius:50%;"></div>
            <span style="font-size:12px;">Centres de collecte de graines</span>
        `);

    // Légende des barrages
    const barrageLegend = legend.append("div")
        .attr("class", "legend-section");
    
    barrageLegend.append("h3").text("Barrages Collinaires");
    
    barrageLegend.append("div")
        .attr("class", "legend-item")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "5px")
        .html(`
            <div class="legend-color" style="background-color:${barrageColor};width:15px;height:15px;margin-right:8px;border-radius:50%;"></div>
            <span style="font-size:12px;">Barrages collinaires</span>
        `);

    // Légende des lacs collinaires
    const lacLegend = legend.append("div")
        .attr("class", "legend-section");
    
    lacLegend.append("h3").text("Lacs Collinaires");
    
    lacLegend.append("div")
        .attr("class", "legend-item")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "5px")
        .html(`
            <div class="legend-color" style="background-color:${lacColor};width:15px;height:15px;margin-right:8px;border-radius:50%;"></div>
            <span style="font-size:12px;">Lacs collinaires</span>
        `);

    // Légende des points MAP3
    const map3Legend = legend.append("div")
        .attr("class", "legend-section");
    
    map3Legend.append("h3").text("Points MAP3");
    
    map3Legend.append("div")
        .attr("class", "legend-item")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "5px")
        .html(`
            <div class="legend-color" style="background-color:${map3Color};width:15px;height:15px;margin-right:8px;border-radius:50%;"></div>
            <span style="font-size:12px;">Points de collecte d'eau</span>
        `);
//selon mes recherches map3=
    // Ajout des contrôles de zoom
    addZoomControls();

}).catch(function(error) {
    console.error("Erreur:", error);
    g.append("text")
        .attr("x", width/2)
        .attr("y", height/2)
        .attr("text-anchor", "middle")
        .text("Erreur de chargement des données");
});

function addZoomControls() {
    const controls = d3.select("body").append("div")
        .attr("class", "zoom-controls")
        .style("position", "fixed")
        .style("top", "20px")
        .style("left", "20px")
        .style("z-index", "1000");

    controls.append("button")
        .text("+")
        .on("click", () => svg.transition().call(zoom.scaleBy, 1.5));

    controls.append("button")
        .text("-")
        .style("margin-top", "5px")
        .on("click", () => svg.transition().call(zoom.scaleBy, 0.75));

    controls.append("button")
        .text("⟲")
        .style("margin-top", "5px")
        .on("click", () => svg.transition().call(zoom.transform, d3.zoomIdentity));
}
//////////////////////////NEW///////////



/////////////////////STATISTIQUES///////////


     // Ajout du titre
        d3.select("#statistics")
            .append("h2")
            .text("L'évolution des indicateurs par Année")
            .style("text-align", "center")
            .style("margin-bottom", "18px");
// Chargement et affichage du diagramme à barres avec tous les KPI
function createBarChart() {
    d3.json(statsUrl).then(function(statsData) {
        if (!statsData?.Feuil1) {
            console.error("Format de données incorrect");
            return;
        }

        const data = statsData.Feuil1.filter(d => !d.Year.toString().includes("-"));
        
        // Configuration du graphique (augmentation de la marge droite pour la légende)
        const margin = {top: 40, right: 180, bottom: 120, left: 80};
        const chartWidth = 800 - margin.left - margin.right;
        const chartHeight = 400 - margin.top - margin.bottom;

        // Création du conteneur SVG pour le graphique
        const chartSvg = d3.select("#statistics").append("svg")
            .attr("width", chartWidth + margin.left + margin.right)
            .attr("height", chartHeight + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
      

        // Définition des KPI à afficher
        const kpis = [
            {key: "Investissement (en DT)", name: "Investissement (DT)", color: "#4e79a7", scale: "primary"},
            {key: "Primes (en DT)", name: "Primes (DT)", color: "#e15759", scale: "primary"},
            {key: "Adhésions", name: "Adhésions", color: "#59a14f", scale: "secondary"},
            {key: "Approbations", name: "Approbations", color: "#f28e2b", scale: "secondary"}
        ];

        // Échelles pour l'axe X
        const x = d3.scaleBand()
            .domain(data.map(d => d.Year))
            .range([0, chartWidth])
            .padding(0.2);
      

        // Échelle primaire (gauche) pour les valeurs monétaires
        const yPrimary = d3.scaleLinear()
            .domain([0, d3.max(data, d => Math.max(
                d["Investissement (en DT)"] || 0,
                d["Primes (en DT)"] || 0
            ))])
            .nice()
            .range([chartHeight, 0]);

        // Échelle secondaire (droite) pour les comptages
        const ySecondary = d3.scaleLinear()
            .domain([0, d3.max(data, d => Math.max(
                d["Adhésions"] || 0,
                d["Approbations"] || 0
            ))])
            .nice()
            .range([chartHeight, 0]);

        // Axe X
        chartSvg.append("g")
            .attr("class", "axis axis-x")
            .attr("transform", `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)");

        // Axe Y primaire (gauche)
        chartSvg.append("g")
            .attr("class", "axis axis-y")
            .call(d3.axisLeft(yPrimary).tickFormat(d => d3.format(".2s")(d)))
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -50)
            .attr("x", -chartHeight/2)
            .attr("text-anchor", "middle")
            .text("Montants (DT)");

        // Axe Y secondaire (droit)
        chartSvg.append("g")
            .attr("class", "axis axis-y")
            .attr("transform", `translate(${chartWidth},0)`)
            .call(d3.axisRight(ySecondary))
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 60)
            .attr("x", -chartHeight/2)
            .attr("text-anchor", "middle")
            .text("Nombre");

        // Barres groupées
        const yearGroups = chartSvg.selectAll(".year-group")
            .data(data)
            .enter().append("g")
            .attr("class", "year-group")
            .attr("transform", d => `translate(${x(d.Year)}, 0)`);

        // Création des barres pour chaque KPI
        kpis.forEach((kpi, i) => {
            yearGroups.append("rect")
                .attr("class", `bar bar-${kpi.key}`)
                .attr("x", x.bandwidth() * (i / kpis.length))
                .attr("width", x.bandwidth() / kpis.length - 2)
                .attr("y", d => {
                    return kpi.scale === "primary" 
                        ? yPrimary(d[kpi.key] || 0)
                        : ySecondary(d[kpi.key] || 0);
                })
                .attr("height", d => {
                    return kpi.scale === "primary"
                        ? chartHeight - yPrimary(d[kpi.key] || 0)
                        : chartHeight - ySecondary(d[kpi.key] || 0);
                })
                .attr("fill", kpi.color)
                .on("mouseover", function(event, d) {
                    d3.select(this).attr("opacity", 0.7);
                    tooltip.transition().duration(200).style("opacity", .9);
                    
                    const value = d[kpi.key] || 0;
                    const formattedValue = kpi.scale === "primary" 
                        ? d3.format(",")(value) + " DT" 
                        : d3.format(",")(value);
                    
                    tooltip.html(`<strong>${d.Year}</strong><br>${kpi.name}: ${formattedValue}`)
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 30) + "px");
                })
                .on("mouseout", function() {
                    d3.select(this).attr("opacity", 1);
                    tooltip.style("opacity", 0);
                });
        });

        // Légende positionnée à droite du graphique
        const legend = chartSvg.append("g")
            .attr("transform", `translate(${chartWidth + 40}, 20)`);

        kpis.forEach((kpi, i) => {
            const legendItem = legend.append("g")
                .attr("transform", `translate(0, ${i * 20})`);

            legendItem.append("rect")
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", kpi.color);

            legendItem.append("text")
                .attr("x", 20)
                .attr("y", 12)
                .text(kpi.name)
                .style("font-size", "10px");
        });

    }).catch(function(error) {
        console.error("Erreur de chargement des stats:", error);
    });
}

// Appel initial
createBarChart();

/////////////////////GRAPHIQUE SECTORIEL///////////

function createSectorChart() {
    d3.json("https://raw.githubusercontent.com/Ranim-Khelifi/Tunisie/refs/heads/main/manpartsecteur.json")
    .then(function(sectorData) {
        if (!sectorData?.Feuil1) {
            console.error("Format de données incorrect");
            return;
        }

        const data = sectorData.Feuil1;
        
        // Conteneur
        const sectorContainer = d3.select("#statistics").append("div")
            .attr("id", "sector-chart-container")
            .style("margin", "20px auto")
            .style("max-width", "900px")
            .style("text-align", "center");

        // Titre
        sectorContainer.append("h2")
            .text("Analyse des indicateurs par Secteur d'Activité")
            .style("margin-bottom", "22px")
            .style("font-size", "22px");

        // Dimensions du graphique
        const margin = {top: 30, right: 250, bottom: 100, left: 60}; 
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        // SVG avec fond transparent
        const svg = sectorContainer.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .style("background", "none");
        
        const chart = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Échelle de l'axe X
        const x = d3.scaleBand()
            .domain(data.map(d => d.Secteur))
            .range([0, width])
            .padding(0.3);

        // Indicateurs avec couleurs
        const indicators = [
            {key: "Total adhésion", name: "Adhésions", color: "#4e79a7", type: "count"},
            {key: "Dossiers approuvés ", name: "Dossiers approuvés", color: "#e15759", type: "count"},
            {key: "Investissements en MD", name: "Investissements (MD)", color: "#59a14f", type: "money"},
            {key: "Prime octroyée en MD", name: "Primes (MD)", color: "#f28e2b", type: "money"}
        ];

        // Maximums pour les axes
        const maxCount = d3.max(data, d => Math.max(d["Total adhésion"], d["Dossiers approuvés "])); 
        const maxMoney = d3.max(data, d => Math.max(d["Investissements en MD"], d["Prime octroyée en MD"])); 

        // Échelles Y
        const yCount = d3.scaleLinear().domain([0, maxCount * 1.1]).range([height, 0]);
        const yMoney = d3.scaleLinear().domain([0, maxMoney * 1.1]).range([height, 0]);

        // Axe X
        chart.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.5em")
            .attr("dy", ".1em")
            .attr("transform", "rotate(-40)")
            .style("font-size", "10px");

        // Axe Y gauche (comptages)
        chart.append("g").call(d3.axisLeft(yCount));

        // Axe Y droit (montants)
        chart.append("g")
            .attr("transform", `translate(${width},0)`)
            .call(d3.axisRight(yMoney).tickFormat(d => d + " MD"));

        // Légende interactive à droite
        const legend = chart.append("g")
            .attr("transform", `translate(${width + 60}, 30)`);

        const legendItems = indicators.map((indicator, i) => {
            const item = legend.append("g")
                .attr("transform", `translate(0, ${i * 25})`); 

            item.append("rect")
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", indicator.color)
                .attr("rx", 2)
                .attr("ry", 2);
            
            const text = item.append("text")
                .attr("x", 20)
                .attr("y", 12)
                .text(indicator.name)
                .style("font-size", "12px")
                .style("font-family", "Arial, sans-serif");

            return { item, text, indicator };
        });

        // Barres interactives
        data.forEach((sector, sectorIndex) => {
            const sectorGroup = chart.append("g")
                .attr("transform", `translate(${x(sector.Secteur)}, 0)`);

            const barWidth = x.bandwidth() / indicators.length * 0.7;
            
            indicators.forEach((indicator, i) => {
                const yScale = indicator.type === "count" ? yCount : yMoney;
                const value = sector[indicator.key];
                
                sectorGroup.append("rect")
                    .attr("x", i * (x.bandwidth() / indicators.length))
                    .attr("width", barWidth)
                    .attr("y", yScale(value))
                    .attr("height", height - yScale(value))
                    .attr("fill", indicator.color)
                    .attr("rx", 2)
                    .attr("ry", 2)
                    .style("cursor", "pointer")
                    .on("click", function() {
                        // Réinitialiser toutes les légendes
                        legendItems.forEach(legendItem => {
                            legendItem.text.text(legendItem.indicator.name);
                        });
                        
                        // Mettre à jour uniquement la légende de l'indicateur sélectionné
                        let formattedValue = value;
                        if (indicator.type === "money") {
                            formattedValue = value.toFixed(2); // Formater en MD pour les valeurs monétaires
                        }

                        // Mise à jour de la légende pour l'indicateur sélectionné
                        const selectedItem = legendItems.find(item => item.indicator.key === indicator.key);
                        if (selectedItem) {
                            selectedItem.text.text(`${selectedItem.indicator.name}: ${formattedValue}`);
                        }
                    });
            });
        });

        // Ajouter la note une seule fois sous le graphique
        sectorContainer.append("p")
            .html("<b>Acronymes des secteurs:</b> <br>IAA (Industrie Agro-Alimentaire)<br>ICC (Industrie Chimique et Pharmaceutique)<br>ICH (Industrie de la Construction et des Matériaux)<br>ID (Industrie de Défense) <br>IMCCV (Industrie Mécanique, Construction, et Composants Véhicules)<br>IME (Industrie de Mécanique et Electronique) <br>ITH (Industrie Textile et Habillement)<br>IS (Industrie des Services)")
            .style("font-size", "12px")
            .style("color", "black")
            .style("margin-top", "20px")
            .style("line-height", "1.6")
            .style("font-family", "Arial, sans-serif")
            .style("text-align", "left")
            .style("margin-left", "20px")
            .style("letter-spacing", "1px")
            .style("text-shadow", "1px 1px 2px rgba(0, 0, 0, 0.1)")
            .style("border", "1px solid #ddd")
            .style("padding", "10px")
            .style("border-radius", "8px");

    }).catch(function(error) {
        console.error("Erreur de chargement des données:", error);
    });
}

// Appel du graphique
createSectorChart();




//////////////////////////////////

