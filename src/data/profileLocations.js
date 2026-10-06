export const PROFILE_LOCATIONS = {
    Bulgaria: ['Sofia','Plovdiv','Varna','Burgas','Ruse','Stara Zagora','Pleven','Sliven','Dobrich','Shumen','Pernik','Haskovo','Yambol','Pazardzhik','Blagoevgrad','Veliko Tarnovo','Vratsa','Gabrovo','Asenovgrad','Vidin','Kazanlak','Kyustendil','Kardzhali','Montana','Dimitrovgrad','Targovishte','Lovech','Silistra','Razgrad','Smolyan'],
    Italy: ['Rome','Milan','Naples','Turin','Palermo','Genoa','Bologna','Florence','Bari','Catania','Venice','Verona','Messina','Padua','Trieste','Taranto','Brescia','Parma','Prato','Modena','Reggio Calabria','Perugia','Ravenna','Livorno','Cagliari','Foggia','Salerno','Lecce','Potenza','Matera','Catanzaro','Cosenza'],
    'United Kingdom': ['London','Birmingham','Manchester','Glasgow','Liverpool','Leeds','Edinburgh','Bristol','Sheffield','Newcastle upon Tyne','Nottingham','Cardiff','Belfast'],
    Germany: ['Berlin','Hamburg','Munich','Cologne','Frankfurt','Stuttgart','Dusseldorf','Leipzig','Dortmund','Essen','Bremen','Dresden'],
    France: ['Paris','Marseille','Lyon','Toulouse','Nice','Nantes','Montpellier','Strasbourg','Bordeaux','Lille'],
    Spain: ['Madrid','Barcelona','Valencia','Seville','Zaragoza','Malaga','Murcia','Palma','Bilbao','Alicante'],
    Portugal: ['Lisbon','Porto','Braga','Coimbra','Faro','Aveiro'],
    Greece: ['Athens','Thessaloniki','Patras','Heraklion','Larissa','Volos'],
    Romania: ['Bucharest','Cluj-Napoca','Timisoara','Iasi','Constanta','Brasov','Craiova'],
    Serbia: ['Belgrade','Novi Sad','Nis','Kragujevac','Subotica'],
    'North Macedonia': ['Skopje','Bitola','Kumanovo','Prilep','Tetovo','Ohrid'],
    Turkey: ['Istanbul','Ankara','Izmir','Bursa','Antalya','Adana','Gaziantep','Konya'],
    Albania: ['Tirana','Durres','Vlore','Shkoder','Elbasan'],
    Croatia: ['Zagreb','Split','Rijeka','Osijek','Zadar'],
    Slovenia: ['Ljubljana','Maribor','Kranj','Celje','Koper'],
    Austria: ['Vienna','Graz','Linz','Salzburg','Innsbruck'],
    Belgium: ['Brussels','Antwerp','Ghent','Charleroi','Liege','Bruges'],
    Netherlands: ['Amsterdam','Rotterdam','The Hague','Utrecht','Eindhoven','Groningen'],
    Poland: ['Warsaw','Krakow','Lodz','Wroclaw','Poznan','Gdansk','Szczecin'],
    Czechia: ['Prague','Brno','Ostrava','Plzen','Liberec'],
    Slovakia: ['Bratislava','Kosice','Presov','Zilina','Nitra'],
    Hungary: ['Budapest','Debrecen','Szeged','Miskolc','Pecs','Gyor'],
    Switzerland: ['Zurich','Geneva','Basel','Lausanne','Bern','Lucerne'],
    Sweden: ['Stockholm','Gothenburg','Malmo','Uppsala'],
    Norway: ['Oslo','Bergen','Trondheim','Stavanger'],
    Denmark: ['Copenhagen','Aarhus','Odense','Aalborg'],
    Finland: ['Helsinki','Espoo','Tampere','Vantaa','Turku'],
    Ireland: ['Dublin','Cork','Limerick','Galway','Waterford'],
    'United States': ['New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia','San Antonio','San Diego','Dallas','San Jose','Austin','Jacksonville','San Francisco'],
    Canada: ['Toronto','Montreal','Vancouver','Calgary','Edmonton','Ottawa','Winnipeg','Quebec City'],
};

export const PROFILE_COUNTRIES = Object.keys(PROFILE_LOCATIONS);

export function getProfileCities(country) {
    return PROFILE_LOCATIONS[country] ?? [];
}
