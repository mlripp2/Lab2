//global variables
var keyArray = ["Deforestation","Poor","Population","GDP","OilPalm", "Coconut", "Rubber"];
var expressed = keyArray[0];
var chartWidth = 450, chartHeight = 350;
var colorize;

window.onload=initialize();

function initialize(){
	setMap();
};

function setMap(){
	var width = 900;
	var height = 420;
	var expressed = "Deforestation"
	var map = d3.select("#map")
     .append("svg")
     .attr("width", width)
     .attr("height", height);

	//create Indonesia Albers eual area conic projection, centered on Indonesia
	var projection = d3.geo.cylindricalEqualArea()
	.center([118,-3])
	.scale(1100)
	.precision(.1)
	.translate([width/ 2, height / 2]);

	//create svg path generator using the projection
	var path = d3.geo.path()
		.projection(projection);

	var graticule = d3.geo.graticule()
		.step([10, 10]);

	var gratBackground = map.append("path")
		.datum(graticule.outline) 
		.attr("class", "gratBackground") 
		.attr("d", path) 
		
	var gratLines = map.selectAll(".gratLines") 
		.data(graticule.lines) 
	  	.enter() 
		.append("path") 
		.attr("class", "gratLines") 
		.attr("d", path); 

	queue()
		.defer(d3.json, "data/IndonShapeEscape.topojson")
		.defer(d3.csv, "data/IndonesiaData3.csv")
		.defer(d3.json, "data/Asia2.topojson")
		.await(callback);
		

	function callback (error, IndonShapeEscape, IndonesiaData, Asia2){
		colorize = colorScale(IndonesiaData);
		var jsonProvs = IndonShapeEscape.objects.IDN_adm1.geometries;
		var csvData = IndonesiaData
		
		//loop through csv to assign each csv values to json province
		for (var i=0; i<csvData.length; i++) {
			var csvProvince = csvData[i]; //the current province
			var csvAdm1 = csvProvince.ID_1; //adm1 code
			//loop through json provinces to find right province
			for (var a=0; a<jsonProvs.length; a++){
			//where adm1 codes match, attach csv to json object
		
			if (jsonProvs[a].properties.ID_1 == csvAdm1){
				 // assign all five key/value pairs
					for (var key in keyArray){
						var attr = keyArray[key];
						var val = parseFloat(csvProvince[attr]);
						jsonProvs[a].properties[attr] = val;	
					};
			jsonProvs[a].properties.name = csvProvince.name; //set prop IS THIS RIGHT it says undefined 
			
			break; //stop looking through the json provinces
		};
	};
};

	
	var province = map.selectAll(".provinces") //create SVG path element
        .data(topojson.feature(IndonShapeEscape, IndonShapeEscape.objects.IDN_adm1).features)
        .enter() //create elements
		.append("g") //give each province its own g element 
		.attr("class", "provinces")
		.append("path")
		.attr("class", function(d) {
			return "IND"+ d.properties.ID_1})
		.attr("d", path)
		.style("fill", function(d) { //color enumeration units
				return choropleth(d, colorize);
			})
		.on("mouseover", highlight)
		.on("mouseout", dehighlight)
		.on("mousemove", moveLabel)
		.append("desc") //append the current color
				.text(function(d) {
					return choropleth(d, colorize);
				});

   	var countries = map.append("path") 
       	.datum(topojson.feature(Asia2, Asia2.objects.Asia))
       	.attr ("class", "countries")
       	.attr("d", path);
       
       	createDropdown(csvData); //create the dropdown menu
		setChart(csvData, colorize); //create the bar chart
	};



function createDropdown(csvData){
	//add a select element for the dropdown menu
	var dropdown = d3.select("#map")
		.append("span")
		.attr("class","dropdown") //for positioning menu with css
		.html("<h3>Select New Variable:</h3>")
		.append("select")
		.on("change", function(){ 
			console.log(this.value)
		changeAttribute(this.value, csvData) }); //changes expressed attribute
	
	//create each option element within the dropdown
	dropdown.selectAll("options")
		.data(keyArray)
		.enter()
		.append("option")
		.attr("value", function(d){ return d })
		.text(function(d) {
			d = d[0].toUpperCase() + d.substring(1,3) + d.substring(3);
			return d
		});
};

function setChart(csvData, colorize){
	//create a second svg element to hold the bar chart

	var chart = d3.select("#accordion")
		.append("svg")
		.attr("width", chartWidth)
		.attr("height", chartHeight)
		.attr("class", "chart"); //adding to css

	//create a text element for the chart title
	var title = chart.append("text")
		.attr("x", 20)
		.attr("y", 40)
		.attr("class", "charttext");

	//set bars for each province
	var bars = chart.selectAll(".bar")
		.data(csvData)
		.enter()
		.append("rect")
		.sort(function(a, b){return a[expressed]-b[expressed]})
		.attr("id", function(d){
			return "bar" + d.ID_1;
		})
		.attr("width", chartWidth / csvData.length - 1)
		.on("mouseover", highlight)
		.on("mouseout", dehighlight)
		.on("mousemove", moveLabel);


	//adjust bars according to current attribute
	updateChart(bars, csvData.length);
};
function colorScale(csvData){

	//create quantile classes with color scale		
	var color = d3.scale.quantile() //designate quantile scale generator
		.range([
			"#ffffcc",
			"#c2e699",
			"#78c679",
			"#31a354",
			"#006837"
		]);
	//set min and max data values as domain
	color.domain([
		d3.min(csvData, function(d) { return Number(d[expressed]); }),
		d3.max(csvData, function(d) { return Number(d[expressed]); })
	]);
	
	return color; //return the color scale generator
};
function choropleth(d, colorize){
	
	
	var value = d.properties ? d.properties[expressed] : d[expressed];
	
	//if value exists, assign it a color; otherwise assign gray
	if (value) {
		
		return colorize(value);
			 //colorize holds the colorScale generator
	} 
	else {
		return "#ccc";
	};
};

function changeAttribute(attribute, csvData){
	console.log(expressed)
	//change the expressed attribute
	expressed = attribute;
	colorize = colorScale(csvData);
	//recolor the map

	d3.selectAll(".provinces") //select every province
		.select("path")
		.style("fill", function(d) { //color enumeration units
			
			return choropleth(d, colorize); //->
		})
		.select("desc") //replace the color text in each province's desc element
			.text(function(d) {
				return choropleth(d, colorize); //->
			});

	//re-sort the bar chart
	var bars = d3.selectAll(".bar")
		.select("path")
		.style("fill", function(d) { //color enumeration units
			
			return choropleth(d, colorize); //->
		})
		.select("desc") //replace the color text in each province's desc element
			.text(function(d) {
				return choropleth(d, colorize); //->
			})
		.sort(function(a, b){
			return a[expressed]-b[expressed];
		})
		.transition() //this adds the super cool animation
		.delay(function(d, i){
			return i * 10 
		});

	//update bars according to current attribute
	updateChart(bars, csvData.length);
};

function updateChart(bars, numbars){
	//style the bars according to currently expressed attribute
	bars.attr("height", function(d, i){
		return Number(d[expressed]);
	})			
		.attr("y", function(d, i){
		switch(expressed){
			case "Deforestation":
				return chartHeight - Number(d[expressed]*.009)
				break;
			case "Poor":
				return chartHeight - Number(d[expressed]*3)
				break;
			case "Population":
				return chartHeight - Number(d[expressed]*.3)
				break;
			case "GDP":
				return chartHeight - Number(d[expressed]*1)
				break;
			case "OilPalm":
				return chartHeight - Number(d[expressed]*.25)
				break;
			case "Coconut":
				return chartHeight - Number(d[expressed]*1)
				break;
			case "Rubber":
				return chartHeight - Number(d[expressed]*.7)
				break;
		}
			return chartHeight - Number(d[expressed])*3;
		})
		.attr("x", function(d, i){
			return i * (chartWidth / numbars);
		})
		.style("fill", function(d){
			return choropleth(d, colorize);
		});

	//update chart title
	d3.select(".charttext")
		.text(
			expressed[0].toUpperCase() + 
			expressed.substring(1,3) + 
			expressed.substring(3) + 
			" In Each Province");
}



function highlight(data){

	//json or csv properties
	var props = data.properties ? data.properties: data;
	var units ="" 
	switch(expressed){
		case "Deforestation":
		case "OilPalm":
		case "Coconut":
		case "Rubber":
			units = " Thousand Hectares" 
			break;
		case "Poor":
			units = "% Impoverished"
			break;
		case "Population":
			units = " People per sq km"
			break;
		case "GDP":
			units = " GDP"
			break;
	}
	d3.selectAll('.IND'+props.ID_1) //select the current province in the DOM
		.style("fill", "#000"); //set the enumeration unit fill to black
	d3.selectAll('#IND'+props.ID_1) //select the current province in the DOM
		.style("fill", "#000");
	d3.selectAll('#bar'+props.ID_1) //select the current province in the DOM
		.style("fill", "#000");
	var labelAttribute = props[expressed]+"<t id='units'>"+units+"</t>"; //label content
		//append("")
		// if (props[expressed]="Deforestation_haYear"){
		// 	return "<h1>"+props[expressed]+
		// "</h1>" + 'Thousand Ha'; //label content
		// }
	var labelName = "<h1>"+props.NAME_1+"</h1>" //the name of the country is not displaying in the popup on the bar chart  
	//console.log(props.NAME_1); //html string for name to go in child div
	//create info label div
	var infolabel = d3.select("#map")
		.append("div") //create the label div
		.attr("class", "infolabel")
		.attr("id", "IND"+props.ID_1+"label") //for styling label
		.html(labelName) //add text
		.append("div") //add child div for feature name
		.attr("class", "labelName") //for styling name
		.html(labelAttribute); //add feature name to label
};

function dehighlight(data){
	var props = data.properties ? data.properties: data;
	var prov = d3.selectAll('.IND'+props.ID_1);
	var bar = d3.selectAll("#bar"+props.ID_1)
	 //designate selector variable for brevity
	var fillcolor = prov.select("desc").text(); //access original color from desc
	prov.style("fill", fillcolor);
	bar.style("fill", fillcolor) //reset enumeration unit to orginal color
	d3.select("#IND"+props.ID_1+"label").remove(); //remove info label

};

function moveLabel() {

	if (d3.event.clientX < window.innerWidth + 245){
		var x = d3.event.clientX; //horizontal label coordinate based mouse position stored in d3.event
	} else {
		var x = d3.event.clientX; //horizontal label coordinate based mouse position stored in d3.event
	};
	if (d3.event.clientY < window.innerHeight + 100){
		var y = d3.event.clientY-400; //vertical label coordinate
	} else {
		var y = d3.event.clientY-400; //vertical label coordinate
	};
	//console.log(d3.select(".infolabel"))
	d3.select(".infolabel") //select the label div for moving
		.style("margin-left", x+"px") //reposition label horizontal
		.style("margin-top", y+"px"); //reposition label vertical
};

}

