function getBlockFromUrlParam() {
  const params = new URL(document.location.href).searchParams
  const block = params.get("block")
  console.log(block)
  return block
}

function getSmallBlockFromUrlParam() {
  const params = new URL(document.location.href).searchParams
  const smallBlock = params.get("sb")
  console.log(smallBlock)
  return smallBlock
}

function findKeyByAreaName(data, areaName) {
  for (const key in data) {
    if (data[key].area_name === areaName) {
      return key;
    }
  }
  return null;
}

function filterDataByAreaIdAndSmallBlock(data, areaId, smallBlockId) {
  return data.filter(item => {
      return item.area_id === areaId && item.name.split('-')[0] === String(smallBlockId);
  });
}

function getStatusText(status) {
  statusDict = {0: "未", 1: "完了", 2: "異常", 3: "予約", 4: "要確認", 5: "異常対応中", 6: "削除"}
  return statusDict[status]
}

function getStatusColor(status) {
  switch (status) {
    case 0:
      return '#0288D1';
    case 1:
      return '#FFD600';
    case 2:
      return '#E65100';
    case 3:
      return '#0F9D58';
    case 4:
      return '#FF9706';
    case 5:
      return '#9106E9';
    case 6:
      return '#FFD600';
    default:
      return '#0288D1';
  }
}

function getPinNote(note) {
  if (note == null) {
    return "なし"
  } else {
    return note
  }
}

async function loadBoardPins(pins, layer, status=null) {
  const areaList = await getAreaList();
  if (status != null) {
    pins = pins.filter(item => item.status == status);
  }
  pins.forEach(pin => {
    var marker = L.circleMarker([pin.lat, pin.long], {
      radius: 8,
      color: 'black',
      weight: 1,
      fillColor: `${getStatusColor(pin.status)}`,
      fillOpacity: 0.9,
      border: 1,
    })
    .addTo(layer);
    marker.bindPopup(`<b>${areaList[pin.area_id]["area_name"]} ${pin.name}</b><br>ステータス: ${getStatusText(pin.status)}<br>備考: ${getPinNote(pin.note)}<br>座標: <a href="https://www.google.com/maps/search/${pin.lat},+${pin.long}" target="_blank" rel="noopener noreferrer">(${pin.lat}, ${pin.long})</a>`);
  });
}

function onLocationFound(e) {
  const radius = e.accuracy / 2;
  const locationMarker = L.marker(e.latlng).addTo(map)
    .bindPopup("現在地").openPopup();
  const locationCircle = L.circle(e.latlng, radius).addTo(map);
  map.setView(e.latlng, 14);
}

function onLocationError(e) {
  // 位置情報エラーは無視
}

const baseLayers = {
  'OpenStreetMap': osm,
  'Google Map': googleMap,
  '国土地理院地図': japanBaseMap,
};

const overlays = {
  '未':  L.layerGroup(),
  '完了':  L.layerGroup(),
  '異常':  L.layerGroup(),
  '要確認':  L.layerGroup(),
  '異常対応中':  L.layerGroup(),
  '削除':  L.layerGroup(),
  '期日前投票所':  L.layerGroup(),
};

const mapConfig = {
  'ueda':     { 'lat': 36.3953, 'long': 138.2594, 'zoom': 13 },
  'shioda':   { 'lat': 36.3500, 'long': 138.2000, 'zoom': 13 },
  'kawanishi':{ 'lat': 36.4200, 'long': 138.1800, 'zoom': 13 },
  'maruko':   { 'lat': 36.4600, 'long': 138.1200, 'zoom': 13 },
  'sanada':   { 'lat': 36.5200, 'long': 138.2300, 'zoom': 13 },
  'takeishi': { 'lat': 36.4000, 'long': 138.0800, 'zoom': 13 },
}

const block = getBlockFromUrlParam()
const smallBlock = getSmallBlockFromUrlParam()
let latlong, zoom;
if (block == null) {
  latlong = [36.4018, 138.2490]
  zoom = 13
} else {
  latlong = [mapConfig[block]['lat'], mapConfig[block]['long']]
  zoom = mapConfig[block]['zoom']
}

var map = L.map('map', {
  layers: [
    overlays['未'],
    overlays['完了'],
    overlays['要確認'],
    overlays['異常'],
    overlays['異常対応中'],
    overlays['削除'],
    overlays['期日前投票所']
  ],
  preferCanvas: true,
});
map.setView(latlong, zoom);
japanBaseMap.addTo(map);
const layerControl = L.control.layers(baseLayers, overlays).addTo(map);

map.on('locationfound', onLocationFound);
map.on('locationerror', onLocationError);
map.locate({setView: false, maxZoom: 14});

let allBoardPins;
getBoardPins(block, smallBlock).then(function(pins) {
  allBoardPins = pins
  loadBoardPins(allBoardPins, overlays['削除'], 6);
  loadBoardPins(allBoardPins, overlays['完了'], 1);
  loadBoardPins(allBoardPins, overlays['異常'], 2);
  loadBoardPins(allBoardPins, overlays['要確認'], 4);
  loadBoardPins(allBoardPins, overlays['異常対応中'], 5);
  loadBoardPins(allBoardPins, overlays['未'], 0);
});

Promise.all([getProgress(), getProgressCountdown()]).then(function(res) {
  progress = res[0];
  progressCountdown = res[1];
  progressBox((progress['total']*100).toFixed(2), 'topleft').addTo(map)
  progressBoxCountdown((parseInt(progressCountdown['total'])), 'topleft').addTo(map)
});

loadVoteVenuePins(overlays['期日前投票所']);