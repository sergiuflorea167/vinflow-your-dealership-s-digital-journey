import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, Navigate, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useProcessStore } from "@/store/processStore";
import { ActivityLog } from "@/components/process/ActivityLog";
import {
  formatCurrency, formatDate, OfferStatus,
  Vehicle, VehicleType, VEHICLE_TYPE_LABELS,
  FuelType, Transmission, DriveType, EmissionClass, VehicleCondition,
  VehicleLocation, LocationKind,
} from "@/data/process";
import {
  ArrowLeft, ArrowRight, Car, CheckCircle2, ChevronDown, Edit2, FileText, Mail, MapPin, Plus, Send,
  Sparkles, X, Save, History, Zap, Search, Euro,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CustomerQuickSelect } from "@/components/shared/CustomerQuickSelect";

// ---- Helpers / Constants ------------------------------------------------

const STATUS_META: Record<OfferStatus, { label: string; className: string }> = {
  draft:    { label: "Entwurf",     className: "bg-muted text-muted-foreground border-border" },
  sent:     { label: "Gesendet",    className: "bg-info/15 text-info border-info/30" },
  accepted: { label: "Angenommen",  className: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Abgelehnt",   className: "bg-destructive/15 text-destructive border-destructive/30" },
  expired:  { label: "Abgelaufen",  className: "bg-muted text-muted-foreground border-border" },
};

const LOCATION_KIND_LABELS: Record<LocationKind, string> = {
  lot: "Hofplatz",
  showroom: "Showroom",
  workshop: "Werkstatt",
  detailer: "Aufbereiter",
  transit: "Transport",
  customer: "Beim Kunden",
  other: "Sonstiges",
};

const FUELS: FuelType[] = ["Benzin", "Diesel", "Hybrid", "Elektro", "Plug-in-Hybrid", "Gas"];
const TRANSMISSIONS: Transmission[] = ["Schaltgetriebe", "Automatik", "DKG", "CVT"];
const DRIVES: DriveType[] = ["Frontantrieb", "Heckantrieb", "Allradantrieb"];
const EMISSIONS: EmissionClass[] = ["Euro 4", "Euro 5", "Euro 6", "Euro 6d", "Euro 6d-TEMP", "Elektro"];
const CONDITIONS: VehicleCondition[] = ["Neu", "Gebraucht", "Jahreswagen", "Vorführwagen", "Tageszulassung", "Oldtimer"];

const formatNumber = (value: number) => value.toLocaleString("de-DE");

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const TYPE_BASE_PRICE: Record<VehicleType, number> = {
  kleinwagen: 24000,
  limousine: 42000,
  kombi: 46000,
  suv: 52000,
  coupe: 48000,
  cabrio: 52000,
  transporter: 42000,
  sportwagen: 85000,
};

const PREMIUM_EQUIPMENT = [
  { pattern: /s[-\s]?line|m[-\s]?sport|amg|r[-\s]?line|fr\b|opc/i, label: "Sport-/Designpaket", factor: 0.035 },
  { pattern: /quattro|xdrive|4matic|allrad|awd/i, label: "Allrad", factor: 0.03 },
  { pattern: /leder|alcantara|nappa|vollleder|teilleder|s[-\s]?line.*(sitz|leder|alcantara)/i, label: "hochwertiger Innenraum", factor: 0.03 },
  { pattern: /sportsitz|sport sitz|s[-\s]?line sitz|kontursitz|schalensitz/i, label: "Sportsitze", factor: 0.02 },
  { pattern: /panorama|pano|schiebedach|glasdach/i, label: "Panoramadach", factor: 0.025 },
  { pattern: /matrix|laser|led|xenon/i, label: "Lichtpaket", factor: 0.02 },
  { pattern: /head[-\s]?up|hud|virtual cockpit|digital cockpit/i, label: "Digital-/Head-up-Cockpit", factor: 0.02 },
  { pattern: /navi|navigation|mmi|command|professional/i, label: "Navigation", factor: 0.018 },
  { pattern: /adaptive cruise|abstand|acc|tempomat|assistenz|lane|spur|totwinkel/i, label: "Assistenzpaket", factor: 0.025 },
  { pattern: /kamera|rückfahrkamera|360|surround|pdc|park/i, label: "Park-/Kamerasystem", factor: 0.018 },
  { pattern: /bang|bose|harman|burmester|soundsystem/i, label: "Soundsystem", factor: 0.018 },
  { pattern: /standheizung/i, label: "Standheizung", factor: 0.02 },
  { pattern: /anhängerkupplung|ahk|towbar/i, label: "Anhängerkupplung", factor: 0.018 },
  { pattern: /memory|massage|belüftung|ventiliert|sitzheizung/i, label: "Komfortsitze", factor: 0.016 },
];

const getBrandFactor = (make: string) => {
  const normalized = make.trim().toLowerCase();
  if (["porsche"].includes(normalized)) return 1.45;
  if (["mercedes", "mercedes-benz", "bmw", "audi"].includes(normalized)) return 1.18;
  if (["tesla", "lexus", "volvo", "land rover", "jaguar"].includes(normalized)) return 1.12;
  if (["vw", "volkswagen", "skoda", "seat", "cupra"].includes(normalized)) return 1.03;
  if (["dacia", "fiat", "citroen", "peugeot", "renault"].includes(normalized)) return 0.92;
  return 1;
};

const getModelClassFactor = (vehicle: Vehicle) => {
  const name = `${vehicle.make} ${vehicle.model}`.toLowerCase();
  if (/porsche|amg gt|m5|rs6|rs7|panamera|911/.test(name)) return 1.28;
  if (/a6|a7|5er|5 series|e[\s-]?klasse|e 220|e 300|v90|xf/.test(name)) return 1.2;
  if (/a4|a5|3er|3 series|c[\s-]?klasse|c 220|c 300|passat|insignia|octavia/.test(name)) return 1.08;
  if (/q5|x3|glc|tiguan|rav[\s-]?4|kodiaq/.test(name)) return 1.12;
  if (/q7|x5|gle|xc90|touareg/.test(name)) return 1.24;
  return 1;
};

const FACELIFT_RULES = [
  {
    make: /audi/i,
    model: /\ba6\b/i,
    start: "2015-01-01",
    label: "Facelift ab 2015",
    terms: ["facelift", "4G C7 Facelift"],
    factor: 0.045,
  },
  {
    make: /audi/i,
    model: /\ba7\b/i,
    start: "2015-01-01",
    label: "Facelift ab 2015",
    terms: ["facelift", "4G Facelift"],
    factor: 0.04,
  },
  {
    make: /bmw/i,
    model: /\b3(er)?\b|f30|f31/i,
    start: "2015-07-01",
    label: "LCI ab 07/2015",
    terms: ["LCI", "Facelift"],
    factor: 0.035,
  },
  {
    make: /mercedes|mercedes-benz/i,
    model: /\bc\b|c[\s-]?klasse|w205|s205/i,
    start: "2018-07-01",
    label: "Facelift ab 07/2018",
    terms: ["facelift", "Mopf"],
    factor: 0.035,
  },
  {
    make: /volkswagen|vw/i,
    model: /\bgolf\b/i,
    start: "2017-01-01",
    label: "Facelift ab 2017",
    terms: ["facelift", "Golf 7.5"],
    factor: 0.03,
  },
];

const MOBILE_DE_MODEL_CODES: Array<{ make: RegExp; model: RegExp; ms: string }> = [
  { make: /audi/i, model: /\ba4\b/i, ms: "1900;9;;" },
  { make: /audi/i, model: /\ba6\b/i, ms: "1900;10;;" },
  { make: /audi/i, model: /\ba7\b/i, ms: "1900;14;;" },
  { make: /bmw/i, model: /\b3(er)?\b|3 series/i, ms: "3500;20;;" },
  { make: /mercedes|mercedes-benz/i, model: /\bc\b|c[\s-]?klasse/i, ms: "17200;21;;" },
  { make: /toyota/i, model: /\brav[\s-]?4\b|rav4/i, ms: "24100;19;;" },
  { make: /volkswagen|vw/i, model: /\bgolf\b/i, ms: "25200;14;;" },
  { make: /volkswagen|vw/i, model: /\bpassat\b/i, ms: "25200;23;;" },
];

const MOBILE_DE_TYPE_CODES: Partial<Record<VehicleType, string>> = {
  kleinwagen: "SmallCar",
  limousine: "Limousine",
  kombi: "EstateCar",
  suv: "OffRoad",
  coupe: "SportsCar",
  cabrio: "Cabrio",
  transporter: "Van",
  sportwagen: "SportsCar",
};

const MOBILE_DE_FUEL_CODES: Partial<Record<FuelType, string[]>> = {
  Benzin: ["PETROL"],
  Diesel: ["DIESEL"],
  Hybrid: ["HYBRID", "HYBRID_DIESEL"],
  Elektro: ["ELECTRICITY"],
  "Plug-in-Hybrid": ["HYBRID"],
  Gas: ["LPG", "CNG"],
};

const MOBILE_DE_TRANSMISSION_CODES: Partial<Record<Transmission, string[]>> = {
  Schaltgetriebe: ["MANUAL_GEAR"],
  Automatik: ["AUTOMATIC_GEAR"],
  DKG: ["SEMIAUTOMATIC_GEAR", "AUTOMATIC_GEAR"],
  CVT: ["AUTOMATIC_GEAR"],
};

const MOBILE_DE_EMISSION_CODES: Partial<Record<EmissionClass, string>> = {
  "Euro 4": "EURO4",
  "Euro 5": "EURO5",
  "Euro 6": "EURO6",
  "Euro 6d": "EURO6D",
  "Euro 6d-TEMP": "EURO6D_TEMP",
  Elektro: "ZERO_EMISSIONS",
};

const getVehicleReferenceDate = (vehicle: Vehicle) => {
  if (vehicle.firstRegistration) return vehicle.firstRegistration.slice(0, 10);
  return `${vehicle.year || new Date().getFullYear()}-07-01`;
};

const getFaceliftInfo = (vehicle: Vehicle) => {
  const rule = FACELIFT_RULES.find((item) => item.make.test(vehicle.make) && item.model.test(vehicle.model));
  if (!rule) return undefined;

  return {
    ...rule,
    isFacelift: getVehicleReferenceDate(vehicle) >= rule.start,
  };
};

const getFeatureTerms = (vehicle: Vehicle) =>
  [
    ...(vehicle.features ?? []),
    vehicle.interiorMaterial,
    vehicle.interiorColor,
  ]
    .map((feature) => feature.trim())
    .filter((feature) => feature.length > 0)
    .slice(0, 12);

const getEquipmentScore = (vehicle: Vehicle) => {
  const haystack = [
    vehicle.model,
    vehicle.modelDetail,
    vehicle.drive,
    vehicle.interiorMaterial,
    vehicle.interiorColor,
    ...(vehicle.features ?? []),
  ].filter(Boolean).join(" ");
  const matches = PREMIUM_EQUIPMENT.filter((item) => item.pattern.test(haystack));
  const factor = clamp(matches.reduce((sum, item) => sum + item.factor, 0), 0, 0.16);

  return {
    factor,
    labels: matches.map((item) => item.label),
  };
};

const getMarketMileageBand = (mileage: number) => {
  const tolerance = mileage >= 120000 ? 20000 : 10000;
  return {
    tolerance,
    min: Math.max(0, mileage - tolerance),
    max: mileage + tolerance,
  };
};

const getMarketYearBand = (vehicle: Vehicle) => {
  const baseYear = vehicle.year || (
    vehicle.firstRegistration ? new Date(vehicle.firstRegistration).getFullYear() : new Date().getFullYear()
  );
  const tolerance = vehicle.firstRegistration ? 1 : 2;
  return {
    tolerance,
    min: baseYear - tolerance,
    max: baseYear + tolerance,
  };
};

const getMarketPowerBand = (vehicle: Vehicle) => {
  const kw = vehicle.power_kw > 0
    ? vehicle.power_kw
    : Math.round((vehicle.power_hp || 0) * 0.7355);
  if (!kw) return undefined;
  const tolerance = kw >= 180 ? 18 : kw >= 110 ? 12 : 8;
  const minKw = Math.max(1, kw - tolerance);
  const maxKw = kw + tolerance;
  return {
    minKw,
    maxKw,
    minHp: Math.round(minKw / 0.7355),
    maxHp: Math.round(maxKw / 0.7355),
  };
};

const getMobileDeModelCode = (vehicle: Vehicle) =>
  MOBILE_DE_MODEL_CODES.find((item) => item.make.test(vehicle.make) && item.model.test(vehicle.model))?.ms;

const getMobileDeColorCode = (value?: string) => {
  const color = (value ?? "").toLowerCase();
  if (/schwarz|black|obsidian|carbon/.test(color)) return "BLACK";
  if (/weiß|weiss|white|alpin|pearl|frost/.test(color)) return "WHITE";
  if (/grau|grey|gray|silber|silver|daytona|selenit|mineral/.test(color)) return "GREY";
  if (/blau|blue/.test(color)) return "BLUE";
  if (/rot|red|rosso/.test(color)) return "RED";
  if (/grün|gruen|green|verde/.test(color)) return "GREEN";
  if (/braun|brown|beige|mokka|mojave/.test(color)) return "BROWN";
  if (/gelb|yellow/.test(color)) return "YELLOW";
  if (/orange/.test(color)) return "ORANGE";
  return undefined;
};

const getMobileDeInteriorCodes = (value?: string) => {
  const material = (value ?? "").toLowerCase();
  const codes = new Set<string>();
  if (/alcantara/.test(material)) codes.add("ALCANTARA");
  if (/vollleder|nappa|leder/.test(material)) codes.add(/teil|partial|alcantara/.test(material) ? "PARTIAL_LEATHER" : "LEATHER");
  if (/stoff|fabric/.test(material)) codes.add("FABRIC");
  if (/kunstleder|vegan|imitation/.test(material)) codes.add("IMITATION_LEATHER");
  if (/velour|velours/.test(material)) codes.add("VELOUR");
  return [...codes];
};

const normalizeFeatureText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss");

const getMobileDeEquipmentCodes = (vehicle: Vehicle) => {
  const text = [
    vehicle.modelDetail,
    vehicle.interiorMaterial,
    ...(vehicle.features ?? []),
  ].filter(Boolean).join(" ").toLowerCase();
  const codes = new Set<string>();
  if (vehicle.serviceBookComplete || /scheckheft|serviceheft|service history|full service/.test(text)) codes.add("FULL_SERVICE_HISTORY");
  if (vehicle.nonSmoker || /nichtraucher|non smoker/.test(text)) codes.add("NONSMOKER_VEHICLE");
  if (/garantie|warranty/.test(text)) codes.add("WARRANTY");
  if (/inspektion neu|service neu|new service/.test(text)) codes.add("NEW_SERVICE");
  if (/sport.?sitz|sportsitz|s[-\s]?line.*sitz/.test(text)) codes.add("SPORT_SEATS");
  if (/sitzheizung|heated seat/.test(text)) codes.add("HEATED_SEATS");
  if (/panorama|pano|glasdach/.test(text)) codes.add("PANORAMIC_GLASS_ROOF");
  if (/schiebedach|sunroof/.test(text)) codes.add("SUNROOF");
  if (/navigation|navi|mmi|command/.test(text)) codes.add("NAVIGATION_SYSTEM");
  if (/rückfahrkamera|rueckfahrkamera|kamera|rear view/.test(text)) codes.add("REAR_VIEW_CAM");
  if (/360|surround/.test(text)) codes.add("360_CAMERA");
  if (/pdc|parksensor|einparkhilfe/.test(text)) codes.add("PARKING_SENSORS");
  if (/head.?up|hud/.test(text)) codes.add("HEAD_UP_DISPLAY");
  if (/matrix|led/.test(text)) codes.add("LED_HEADLIGHTS");
  if (/xenon/.test(text)) codes.add("XENON_HEADLIGHTS");
  if (/anhängerkupplung|anhaengerkupplung|ahk|towbar/.test(text)) codes.add("TRAILER_COUPLING");
  return [...codes];
};

const getMobileDeDetailedEquipmentCodes = (vehicle: Vehicle) => {
  const text = normalizeFeatureText([
    vehicle.modelDetail,
    vehicle.interiorMaterial,
    ...(vehicle.features ?? []),
  ].filter(Boolean).join(" "));
  const codes = new Set(getMobileDeEquipmentCodes(vehicle));
  const addIf = (pattern: RegExp, code: string) => {
    if (pattern.test(text)) codes.add(code);
  };

  if (vehicle.serviceBookComplete) codes.add("FULL_SERVICE_HISTORY");
  if (vehicle.nonSmoker) codes.add("NONSMOKER_VEHICLE");
  addIf(/scheckheft|serviceheft|service history|full service/, "FULL_SERVICE_HISTORY");
  addIf(/nichtraucher|non smoker/, "NONSMOKER_VEHICLE");
  addIf(/garantie|warranty/, "WARRANTY");
  addIf(/inspektion neu|service neu|new service/, "NEW_SERVICE");
  addIf(/abgedunkelte scheiben|getonte scheiben|privacy glass|privacy verglasung/, "DARK_TINTED_WINDOWS");
  addIf(/\babs\b|antiblockier/, "ABS");
  addIf(/abstandswarner|distance warning|front assist|kollisionswarner/, "DISTANCE_WARNING");
  addIf(/adaptives fahrwerk|adaptive suspension|fahrwerksregelung|dcc/, "ADAPTIVE_SUSPENSION");
  addIf(/adaptives kurvenlicht|kurvenlicht|adaptive light|bending lights/, "ADAPTIVE_LIGHTS");
  addIf(/allwetterreifen|ganzjahresreifen|all season/, "ALL_SEASON_TIRES");
  addIf(/beheizbare frontscheibe|frontscheibenheizung|heated windscreen|heated windshield/, "HEATED_WINDSHIELD");
  addIf(/behindertengerecht|rollstuhl|disabled/, "DISABLED_ACCESSIBLE");
  addIf(/berganfahrassistent|hill start|auto hold/, "HILL_START_ASSIST");
  addIf(/bi[-\s]?xenon/, "BI_XENON_HEADLIGHTS");
  addIf(/blendfreies fernlicht|matrix|blendfrei/, "GLARE_FREE_HIGH_BEAM");
  addIf(/dachreling|roof rail/, "ROOF_RAILS");
  addIf(/elektr\.? heckklappe|elektrische heckklappe|power tailgate|heckklappe elektrisch/, "ELECTRIC_TAILGATE");
  addIf(/wegfahrsperre|immobilizer/, "IMMOBILIZER");
  addIf(/\besp\b|stabilitatsprogramm|stabilitaetsprogramm/, "ESP");
  addIf(/faltdach|folding roof/, "FOLDING_ROOF");
  addIf(/fernlichtassistent|high beam assist/, "HIGH_BEAM_ASSIST");
  addIf(/geschwindigkeitsbegrenzer|speed limiter|limiter/, "SPEED_LIMITER");
  addIf(/laserlicht|laser light/, "LASER_HEADLIGHTS");
  addIf(/led[-\s]?scheinwerfer|matrix led|led licht|led headlights/, "LED_HEADLIGHTS");
  addIf(/led[-\s]?tagfahrlicht|daytime running light|tagfahrlicht/, "DAYTIME_RUNNING_LIGHTS");
  addIf(/leichtmetallfelgen|alu felgen|alufelgen|alloy wheels/, "ALLOY_WHEELS");
  addIf(/lichtsensor|light sensor/, "LIGHT_SENSOR");
  addIf(/luftfederung|air suspension/, "AIR_SUSPENSION");
  addIf(/nachtsicht|night vision/, "NIGHT_VISION_ASSIST");
  addIf(/nebelscheinwerfer|fog light/, "FOG_LAMP");
  addIf(/notbremsassistent|emergency brake|bremsassistent/, "EMERGENCY_BRAKE_ASSIST");
  addIf(/notrad|emergency wheel/, "EMERGENCY_WHEEL");
  addIf(/pannenkit|tire repair|reifenreparatur/, "TIRE_REPAIR_KIT");
  addIf(/panorama|pano|glasdach/, "PANORAMIC_GLASS_ROOF");
  addIf(/regensensor|rain sensor/, "RAIN_SENSOR");
  addIf(/reifendruck|rdk|tpms/, "TIRE_PRESSURE_MONITORING");
  addIf(/reserverad|spare wheel/, "SPARE_WHEEL");
  addIf(/scheinwerferreinigung|headlight washer/, "HEADLIGHT_WASHER_SYSTEM");
  addIf(/schiebedach|sunroof/, "SUNROOF");
  addIf(/schlussellose zentralverriegelung|keyless|keyless go|komfortzugang/, "KEYLESS_ENTRY");
  addIf(/servolenkung|power steering/, "POWER_ASSISTED_STEERING");
  addIf(/sommerreifen|summer tires/, "SUMMER_TIRES");
  addIf(/sportfahrwerk|sports suspension/, "SPORT_SUSPENSION");
  addIf(/sportpaket|s[-\s]?line|m[-\s]?sport|amg|r[-\s]?line|fr\b/, "SPORT_PACKAGE");
  addIf(/spurhalteassistent|lane assist|lane departure|spurhalte/, "LANE_DEPARTURE_WARNING");
  addIf(/stahlfelgen|steel wheels/, "STEEL_WHEELS");
  addIf(/start[\/\s-]?stopp|start stop/, "START_STOP_SYSTEM");
  addIf(/totwinkel|blind spot|side assist/, "BLIND_SPOT_MONITOR");
  addIf(/traktionskontrolle|traction control|asr/, "TRACTION_CONTROL_SYSTEM");
  addIf(/verkehrszeichen|traffic sign/, "TRAFFIC_SIGN_RECOGNITION");
  addIf(/winterpaket|winter package/, "WINTER_PACKAGE");
  addIf(/winterreifen|winter tires/, "WINTER_TIRES");
  addIf(/zentralverriegelung|central locking/, "CENTRAL_LOCKING");
  addIf(/alarmanlage|alarm system/, "ALARM_SYSTEM");
  addIf(/ambiente|ambient/, "AMBIENT_LIGHTING");
  addIf(/android auto/, "ANDROID_AUTO");
  addIf(/apple carplay|carplay/, "APPLE_CARPLAY");
  addIf(/armlehne|armrest/, "ARM_REST");
  addIf(/beheizbares lenkrad|lenkradheizung|heated steering/, "HEATED_STEERING_WHEEL");
  addIf(/bluetooth/, "BLUETOOTH");
  addIf(/bordcomputer|on-board computer|board computer/, "ON_BOARD_COMPUTER");
  addIf(/cd[-\s]?spieler|cd player/, "CD_PLAYER");
  addIf(/elektr\.? fensterheber|elektrische fensterheber|electric windows/, "ELECTRIC_WINDOWS");
  addIf(/elektr\.? seitenspiegel|elektrische seitenspiegel|electric mirror/, "ELECTRIC_EXTERIOR_MIRRORS");
  addIf(/anklappbar|folding mirror/, "ELECTRIC_FOLDING_MIRRORS");
  addIf(/elektr\.? sitz|elektrische sitz|electric seat/, "ELECTRIC_ADJUSTABLE_SEATS");
  addIf(/memory|memo/, "ELECTRIC_ADJUSTABLE_SEATS_WITH_MEMORY");
  addIf(/freisprecheinrichtung|handsfree|hands-free/, "HANDSFREEKIT");
  addIf(/gepackraumabtrennung|trennnetz|luggage compartment/, "LUGGAGE_COMPARTMENT_SEPARATION");
  addIf(/head[-\s]?up|\bhud\b/, "HEAD_UP_DISPLAY");
  addIf(/induktionsladen|wireless charging|inductive charging/, "WIRELESS_CHARGING");
  addIf(/innenspiegel.*abblend|autom\.? abblend|auto dimming mirror/, "DIMMING_INTERIOR_MIRROR");
  addIf(/isofix beifahrer/, "ISOFIX_PASSENGER_SEAT");
  addIf(/isofix/, "ISOFIX");
  addIf(/lederlenkrad|leather steering/, "LEATHER_STEERING_WHEEL");
  addIf(/lordosen|lumbar/, "LUMBAR_SUPPORT");
  addIf(/massage/, "MASSAGE_SEATS");
  addIf(/mudigkeitswarner|muedigkeitswarner|attention assist|fatigue/, "FATIGUE_WARNING_SYSTEM");
  addIf(/multifunktionslenkrad|multi.?function steering/, "MULTIFUNCTIONAL_WHEEL");
  addIf(/musikstreaming|music streaming/, "INTEGRATED_MUSIC_STREAMING");
  addIf(/navigation|navi|mmi|command/, "NAVIGATION_SYSTEM");
  addIf(/notrufsystem|emergency call|ecall/, "EMERGENCY_CALL_SYSTEM");
  addIf(/dab|digital radio/, "DAB_RADIO");
  addIf(/raucherpaket|smoker package/, "SMOKERS_PACKAGE");
  addIf(/rechtslenker|right hand drive|rhd/, "RIGHT_HAND_DRIVE");
  addIf(/schaltwippen|shift paddle|paddle/, "SHIFT_PADDLES");
  addIf(/sitzbeluftung|sitzbelueftung|ventilated seats/, "VENTILATED_SEATS");
  addIf(/sitzheizung hinten|heated rear seats/, "HEATED_REAR_SEATS");
  addIf(/sitzheizung|heated seats?/, "HEATED_SEATS");
  addIf(/skisack|ski bag/, "SKI_BAG");
  addIf(/soundsystem|bang|bose|harman|burmester|b&o/, "SOUND_SYSTEM");
  addIf(/sport.?sitz|sportsitz|s[-\s]?line.*sitz/, "SPORT_SEATS");
  addIf(/sprachsteuerung|voice control/, "VOICE_CONTROL");
  addIf(/standheizung|auxiliary heating/, "AUXILIARY_HEATING");
  addIf(/touchscreen|touch screen/, "TOUCHSCREEN");
  addIf(/tuner|radio/, "TUNER");
  addIf(/\btv\b|fernseher/, "TV");
  addIf(/umklappbarer beifahrersitz|folding passenger seat/, "FOLD_FLAT_PASSENGER_SEAT");
  addIf(/\busb\b/, "USB");
  addIf(/virtuelle seitenspiegel|virtual mirror/, "VIRTUAL_EXTERIOR_MIRRORS");
  addIf(/volldigital|virtual cockpit|digital cockpit|digitales kombiinstrument/, "DIGITAL_COCKPIT");
  addIf(/wlan|wifi|hotspot/, "WLAN_WIFI_HOTSPOT");
  addIf(/ruckfahrkamera|rueckfahrkamera|kamera|rear view/, "REAR_VIEW_CAM");
  addIf(/360|surround/, "360_CAMERA");
  addIf(/pdc|parksensor|einparkhilfe/, "PARKING_SENSORS");
  addIf(/xenon/, "XENON_HEADLIGHTS");
  addIf(/anhangerkupplung|ahk|towbar/, "TRAILER_COUPLING");
  return [...codes];
};

const getMobileDeHardEquipmentCodes = (vehicle: Vehicle) => {
  const codes = new Set<string>();
  if (vehicle.serviceBookComplete) codes.add("FULL_SERVICE_HISTORY");
  if (vehicle.nonSmoker) codes.add("NONSMOKER_VEHICLE");
  return [...codes];
};

const buildMobileDeSearchUrl = (
  vehicle: Vehicle,
  year: ReturnType<typeof getMarketYearBand>,
  mileage: ReturnType<typeof getMarketMileageBand>,
) => {
  const params = new URLSearchParams({
    dam: "false",
    fr: `${year.min}:${year.max}`,
    ml: `${mileage.min}:${mileage.max}`,
    ref: "quickSearch",
    s: "Car",
    sb: "rel",
    vc: "Car",
    cn: "DE",
  });
  const appendMany = (key: string, values: Array<string | undefined>) => {
    values.filter(Boolean).forEach((value) => params.append(key, value as string));
  };
  const modelCode = getMobileDeModelCode(vehicle);
  if (modelCode) {
    params.set("ms", modelCode);
  }
  if (vehicle.condition && vehicle.condition !== "Neu") params.set("con", "USED");
  if (vehicle.condition === "Neu") params.set("con", "NEW");
  const power = getMarketPowerBand(vehicle);
  if (power) params.set("pw", `${power.minKw}:${power.maxKw}`);
  if (vehicle.displacement_ccm) params.set("cc", `${Math.max(0, vehicle.displacement_ccm - 200)}:${vehicle.displacement_ccm + 200}`);
  if (vehicle.cylinders) params.set("cy", `${Math.max(1, vehicle.cylinders - 1)}:${vehicle.cylinders + 1}`);
  if (vehicle.seats) params.set("cnc", `:${vehicle.seats + 2}`);
  if (vehicle.previousOwners) params.set("pvo", String(Math.min(vehicle.previousOwners + 1, 4)));
  if (vehicle.drive === "Allradantrieb") params.set("dt", "ALL_WHEEL");
  if (vehicle.emissionClass && MOBILE_DE_EMISSION_CODES[vehicle.emissionClass]) params.set("emc", MOBILE_DE_EMISSION_CODES[vehicle.emissionClass]!);

  appendMany("c", [MOBILE_DE_TYPE_CODES[vehicle.type]]);
  appendMany("ft", MOBILE_DE_FUEL_CODES[vehicle.fuel] ?? []);
  appendMany("tr", MOBILE_DE_TRANSMISSION_CODES[vehicle.transmission] ?? []);
  appendMany("it", getMobileDeInteriorCodes(vehicle.interiorMaterial));
  appendMany("fe", getMobileDeHardEquipmentCodes(vehicle));

  const exteriorColor = getMobileDeColorCode(vehicle.color);
  const interiorColor = getMobileDeColorCode(vehicle.interiorColor);
  if (exteriorColor) params.set("ecol", exteriorColor);
  if (interiorColor) params.set("icol", interiorColor);

  if (vehicle.vatReportable) params.set("gi", "12");
  if (vehicle.status === "in_stock") params.set("rtd", "true");
  return `https://suchen.mobile.de/fahrzeuge/detailsuche?${params.toString()}`;
};

const getMarketValueEstimate = (vehicle: Vehicle) => {
  const currentYear = new Date().getFullYear();
  const age = Math.max(0, currentYear - (vehicle.year || currentYear));
  const ageFactor = clamp(Math.pow(0.905, age), vehicle.fuel === "Elektro" ? 0.22 : 0.2, 1);
  const mileageFactor = clamp(1.06 - vehicle.mileage / 420000, 0.5, 1.06);
  const powerFactor = clamp(0.9 + (vehicle.power_hp || 150) / 700, 0.94, 1.26);
  const fuelFactor = vehicle.fuel === "Elektro" ? 0.9 : vehicle.fuel === "Plug-in-Hybrid" ? 0.95 : vehicle.fuel === "Diesel" ? 0.99 : 1;
  const equipment = getEquipmentScore(vehicle);
  const facelift = getFaceliftInfo(vehicle);
  const faceliftFactor = facelift?.isFacelift ? 1 + Math.min(facelift.factor, 0.035) : 1;
  const equipmentFactor = 1 + Math.min(equipment.factor, 0.1);
  const calculatedAnchor =
    TYPE_BASE_PRICE[vehicle.type]
    * getBrandFactor(vehicle.make)
    * getModelClassFactor(vehicle)
    * ageFactor
    * mileageFactor
    * powerFactor
    * fuelFactor
    * equipmentFactor
    * faceliftFactor;
  const priceAnchor = Math.max(vehicle.listPrice || 0, vehicle.purchasePrice || 0);
  const cappedOwnAnchor = priceAnchor > 0 ? Math.min(priceAnchor, calculatedAnchor * 1.32) : 0;
  const anchor = cappedOwnAnchor > 0
    ? (cappedOwnAnchor * 0.28 + calculatedAnchor * 0.72)
    : calculatedAnchor;
  const dataScore = [
    vehicle.make,
    vehicle.model,
    vehicle.year > 0,
    vehicle.mileage > 0,
    vehicle.power_hp > 0,
    vehicle.fuel,
    vehicle.transmission,
    vehicle.firstRegistration,
    vehicle.hsn && vehicle.tsn,
    getFeatureTerms(vehicle).length >= 3,
    equipment.labels.length > 0,
    facelift,
    priceAnchor > 0,
  ].filter(Boolean).length;
  const quality = dataScore >= 10 ? "hoch" : dataScore >= 7 ? "mittel" : "niedrig";
  const spreadPct = quality === "hoch" ? 0.045 : quality === "mittel" ? 0.07 : 0.11;
  const conditionSpread = vehicle.condition === "Neu" || vehicle.condition === "Tageszulassung" ? 0.02 : 0;
  const finalSpread = Math.max(0.035, spreadPct - conditionSpread - Math.min(equipment.labels.length, 4) * 0.004);

  return {
    min: Math.round((anchor * (1 - finalSpread)) / 100) * 100,
    max: Math.round((anchor * (1 + finalSpread)) / 100) * 100,
    midpoint: Math.round(anchor / 100) * 100,
    quality,
    spreadPct: finalSpread,
    equipmentLabels: equipment.labels,
    factors: [
      { label: "Alter", value: ageFactor },
      { label: "Kilometer", value: mileageFactor },
      { label: "Leistung", value: powerFactor },
      { label: "Ausstattung", value: equipmentFactor },
      { label: "Facelift", value: faceliftFactor },
    ],
    faceliftLabel: facelift ? `${facelift.label} · ${facelift.isFacelift ? "erkannt" : "nicht erkannt"}` : undefined,
  };
};

const buildMarketSearchProfile = (vehicle: Vehicle) => {
  const year = getMarketYearBand(vehicle);
  const mileage = getMarketMileageBand(vehicle.mileage);
  const power = getMarketPowerBand(vehicle);
  const featureTerms = getFeatureTerms(vehicle);
  const facelift = getFaceliftInfo(vehicle);
  const faceliftTerms = facelift
    ? (facelift.isFacelift ? facelift.terms : ["vor Facelift", "pre facelift"])
    : [];
  const exactFeatureTerms = featureTerms.slice(0, 5);
  const coreTerms = [
    vehicle.make,
    vehicle.model,
    vehicle.modelDetail,
    vehicle.fuel,
    vehicle.transmission,
    vehicle.power_hp ? `${vehicle.power_hp} PS` : undefined,
    vehicle.hsn && vehicle.tsn ? `HSN ${vehicle.hsn} TSN ${vehicle.tsn}` : undefined,
    ...faceliftTerms,
  ].filter(Boolean).join(" ");
  const fullQuery = [
    coreTerms,
    featureTerms.join(" "),
    `${year.min}-${year.max}`,
    `${formatNumber(mileage.min)}-${formatNumber(mileage.max)} km`,
  ].filter(Boolean).join(" ");
  const exactQuery = [
    coreTerms,
    exactFeatureTerms.join(" "),
    `"${year.min}" OR "${vehicle.year}" OR "${year.max}"`,
    `${formatNumber(mileage.min)}-${formatNumber(mileage.max)} km`,
  ].filter(Boolean).join(" ");
  const mobileDeUrl = buildMobileDeSearchUrl(vehicle, year, mileage);

  return {
    query: fullQuery,
    exactQuery,
    mobileDeUrl,
    year,
    mileage,
    power,
    features: featureTerms,
    faceliftLabel: facelift ? `${facelift.label} · ${facelift.isFacelift ? "Facelift erkannt" : "Vor-Facelift erkannt"}` : undefined,
  };
};

// =========================================================================

const VehicleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const vehicle = useProcessStore((s) => s.vehicles.find((v) => v.id === id));
  const allOffers = useProcessStore((s) => s.offers);
  const offers = useMemo(() => allOffers.filter((o) => o.vehicleId === (id ?? "")), [allOffers, id]);
  const customers = useProcessStore((s) => s.customers);
  const getCustomer = useProcessStore((s) => s.getCustomer);
  const process = useProcessStore((s) => s.processes.find((p) => p.vehicleId === id));
  const locations = useProcessStore((s) => s.settings.locations);
  const getActivitiesFor = useProcessStore((s) => s.getActivitiesFor);
  const vehicleActivities = useMemo(() => getActivitiesFor({ vehicleId: id }), [getActivitiesFor, id]);

  const addOffer = useProcessStore((s) => s.addOffer);
  const updateOfferStatus = useProcessStore((s) => s.updateOfferStatus);
  const acceptOffer = useProcessStore((s) => s.acceptOffer);
  const updateVehicle = useProcessStore((s) => s.updateVehicle);
  const changeVehicleLocation = useProcessStore((s) => s.changeVehicleLocation);
  const startProcessForVehicle = useProcessStore((s) => s.startProcessForVehicle);

  const [offerDialog, setOfferDialog] = useState(false);
  const [directDialog, setDirectDialog] = useState(false);
  const [locationDialog, setLocationDialog] = useState(false);
  const [marketDialog, setMarketDialog] = useState(false);
  const [marketResearchStarted, setMarketResearchStarted] = useState(false);

  if (!vehicle) return <Navigate to="/bestand" replace />;

  const acceptedOffer = offers.find((o) => o.status === "accepted");
  const canAcceptMore = !acceptedOffer && !process;
  const marketSearch = buildMarketSearchProfile(vehicle);
  const marketEstimate = getMarketValueEstimate(vehicle);
  const marketFilterCount = getMobileDeDetailedEquipmentCodes(vehicle).length;
  const openMarketSearches = () => {
    setMarketResearchStarted(true);
    window.open(marketSearch.mobileDeUrl, "_blank", "noopener,noreferrer");
    toast.success("Automatischer Suchauftrag über mobile.de gestartet.");
  };

  const recalculateMarketValue = () => {
    setMarketResearchStarted(true);
    window.open(marketSearch.mobileDeUrl, "_blank", "noopener,noreferrer");
    toast.success("Marktwert neu ermittelt.");
  };

  // ---- Save helper for inline-edit sections -----------------------------
  const handleSaveSection = (patch: Partial<Vehicle>) => {
    updateVehicle(vehicle.id, patch);
    toast.success("Fahrzeugdaten aktualisiert.");
  };

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-in">
        <RouterLink to="/bestand" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Zurück zum Bestand
        </RouterLink>

        {/* ---------- Verkaufs-Header ---------- */}
        {(() => {
          const margin = vehicle.listPrice - vehicle.purchasePrice;
          const marginPct = vehicle.purchasePrice > 0 ? (margin / vehicle.purchasePrice) * 100 : 0;
          const daysInStock = Math.max(
            0,
            Math.floor((Date.now() - new Date(vehicle.location.since).getTime()) / 86400000),
          );
          const acceptedCount = offers.filter((o) => o.status === "accepted").length;
          const openCount = offers.filter((o) => o.status === "sent").length;

          return (
            <Card className="p-6 bg-gradient-surface border-border shadow-card">
              <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
                {/* Linke Spalte: Identität + Standort-Chip */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="size-16 rounded-2xl bg-gradient-brand grid place-items-center shadow-glow shrink-0">
                    <Car className="size-8 text-primary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">Fahrzeug {vehicle.id}</p>
                      <span className="text-muted-foreground/40">·</span>
                      <button
                        type="button"
                        onClick={() => setLocationDialog(true)}
                        className="inline-flex items-center gap-1.5 text-xs text-info hover:text-info/80 transition-smooth group"
                        title={`${LOCATION_KIND_LABELS[vehicle.location.kind]} · seit ${formatDate(vehicle.location.since)}${vehicle.location.note ? ` · ${vehicle.location.note}` : ""}`}
                      >
                        <MapPin className="size-3.5" />
                        <span className="font-medium truncate max-w-[200px]">{vehicle.location.name}</span>
                        <Edit2 className="size-3 opacity-0 group-hover:opacity-100 transition-smooth" />
                      </button>
                    </div>
                    <h1 className="text-3xl font-display font-bold leading-tight">
                      {vehicle.make} {vehicle.model}
                    </h1>
                    {vehicle.modelDetail && (
                      <p className="text-sm text-muted-foreground">{vehicle.modelDetail}</p>
                    )}
                    <p className="font-mono text-[11px] text-muted-foreground mt-1">VIN {vehicle.vin}</p>
                  </div>
                </div>

                {/* Rechte Spalte: Preis + Verkaufs-CTAs */}
                <div className="flex flex-col items-stretch xl:items-end gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Verkaufspreis</p>
                    <p className="text-4xl font-display font-bold text-primary-glow leading-none">{formatCurrency(vehicle.listPrice)}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      EK {formatCurrency(vehicle.purchasePrice)} ·{" "}
                      <span className={cn("font-semibold", margin > 0 ? "text-success" : "text-destructive")}>
                        +{formatCurrency(margin)} ({marginPct.toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                  <Button onClick={() => setMarketDialog(true)} variant="outline" size="sm" className="gap-1.5 justify-center">
                    <Euro className="size-3.5" /> Fahrzeugwert
                  </Button>
                  {!process && (
                    <div className="flex gap-2 justify-end">
                      <Button onClick={() => setOfferDialog(true)} variant="outline" size="sm" className="gap-1.5">
                        <Plus className="size-3.5" /> Angebot
                      </Button>
                      <Button onClick={() => setDirectDialog(true)} size="sm" className="bg-gradient-brand gap-1.5">
                        <Zap className="size-3.5" /> Direkt verkaufen
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* KPI-Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Tage im Bestand</p>
                  <p className={cn(
                    "font-display text-xl font-bold mt-0.5",
                    daysInStock > 90 ? "text-warning" : "text-foreground",
                  )}>{daysInStock}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Offene Angebote</p>
                  <p className="font-display text-xl font-bold mt-0.5 text-foreground">
                    {openCount}
                    {acceptedCount > 0 && <span className="text-success text-sm font-medium ml-2">· 1 angenommen</span>}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Kilometerstand</p>
                  <p className="font-display text-xl font-bold mt-0.5 text-foreground">
                    {vehicle.mileage?.toLocaleString("de-DE") ?? "–"} <span className="text-xs font-normal text-muted-foreground">km</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Erstzulassung</p>
                  <p className="font-display text-xl font-bold mt-0.5 text-foreground">
                    {vehicle.firstRegistration ? formatDate(vehicle.firstRegistration) : "–"}
                  </p>
                </div>
              </div>
            </Card>
          );
        })()}

        {/* ---------- Vorgang (falls vorhanden) ---------- */}
        {process && (
          <Card className="p-5 bg-success/5 border-success/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-5 text-success" />
              <div>
                <p className="font-display font-semibold text-foreground">Vorgang läuft: {process.id}</p>
                <p className="text-xs text-muted-foreground">Aktueller Schritt: {process.currentStep}</p>
              </div>
            </div>
            <Button asChild className="bg-gradient-brand">
              <RouterLink to={`/vorgaenge/${process.id}`}>Vorgang öffnen</RouterLink>
            </Button>
          </Card>
        )}

        {/* ---------- Angebote & Verkauf (oben für schnellen Zugriff) ---------- */}
        <Card className="p-6 bg-card border-border shadow-card">
          <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-display font-semibold">Angebote &amp; Verkauf</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {offers.length} Angebot{offers.length !== 1 ? "e" : ""}
                {!process && offers.length === 0 && " · noch keine Verkaufsaktivität"}
              </p>
            </div>
            {!process && offers.length > 0 && (
              <Button onClick={() => setOfferDialog(true)} variant="outline" size="sm" className="gap-1.5">
                <Plus className="size-3.5" /> Weiteres Angebot
              </Button>
            )}
          </div>

          {offers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              Noch keine Angebote für dieses Fahrzeug.
            </div>
          ) : (
            <div className="space-y-3">
              {offers.map((offer) => {
                const cust = getCustomer(offer.customerId);
                const meta = STATUS_META[offer.status];
                return (
                  <div key={offer.id} className={cn(
                    "rounded-xl border p-4 transition-smooth",
                    offer.status === "accepted" ? "bg-success/5 border-success/30" : "bg-background/40 border-border hover:border-primary/40"
                  )}>
                    <div className="flex items-center justify-between gap-4">
                      <RouterLink
                        to={`/angebote/${offer.id}`}
                        className="flex items-center gap-3 min-w-0 flex-1 group"
                      >
                        <div className="size-10 rounded-lg bg-secondary grid place-items-center text-secondary-foreground font-display font-bold text-sm shrink-0">
                          {cust?.name.split(" ").map((n) => n[0]).slice(0, 2).join("") ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-display font-semibold text-foreground truncate group-hover:text-primary-glow transition-smooth">{cust?.name ?? "Unbekannt"}</p>
                            <Badge className={meta.className}>{meta.label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">{offer.id} · gültig bis {formatDate(offer.validUntil)}</p>
                        </div>
                      </RouterLink>
                      <div className="text-right shrink-0">
                        <p className="font-display text-xl font-bold text-foreground">{formatCurrency(offer.price)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">erstellt {formatDate(offer.createdAt)}</p>
                      </div>
                    </div>

                    {offer.status === "sent" && canAcceptMore && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                        <Button asChild size="sm" variant="outline" className="gap-1.5">
                          <RouterLink to={`/angebote/${offer.id}`}>
                            <FileText className="size-3.5" /> Beleg öffnen
                          </RouterLink>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { updateOfferStatus(offer.id, "rejected"); toast.message("Angebot abgelehnt."); }} className="gap-1.5">
                          <X className="size-3.5" /> Ablehnen
                        </Button>
                        <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground gap-1.5"
                          onClick={() => {
                            const proc = acceptOffer(offer.id);
                            toast.success(`Angebot angenommen · Vorgang ${proc?.id} gestartet.`);
                            if (proc) navigate(`/vorgaenge/${proc.id}`);
                          }}>
                          <CheckCircle2 className="size-3.5" /> Annehmen → Vorgang
                        </Button>
                      </div>
                    )}
                    {offer.status === "draft" && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                        <Button asChild size="sm" variant="outline" className="gap-1.5">
                          <RouterLink to={`/angebote/${offer.id}`}>
                            <FileText className="size-3.5" /> Felder ausfüllen
                          </RouterLink>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { updateOfferStatus(offer.id, "sent"); toast.success("Angebot versendet."); }} className="gap-1.5">
                          <Send className="size-3.5" /> Senden
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ---------- Daten-Sektionen mit Inline-Edit (einklappbar) ---------- */}
        <Section
          title="Identifikation"
          defaultOpen
          rows={[
            { label: "Fahrzeugtyp", value: VEHICLE_TYPE_LABELS[vehicle.type] },
            { label: "Marke", value: vehicle.make },
            { label: "Modell", value: vehicle.model },
            { label: "Modell-Details", value: vehicle.modelDetail },
            { label: "Baujahr", value: vehicle.year },
            { label: "Zustand", value: vehicle.condition },
            { label: "VIN", value: vehicle.vin, mono: true },
            { label: "HSN", value: vehicle.hsn, mono: true },
            { label: "TSN", value: vehicle.tsn, mono: true },
            { label: "Kennzeichen", value: vehicle.licensePlate, mono: true },
            { label: "Vorbesitzer", value: vehicle.previousOwners },
            { label: "Kilometerstand", value: `${vehicle.mileage.toLocaleString("de-DE")} km` },
          ]}
          renderEditor={(close) => (
            <IdentificationEditor vehicle={vehicle} onSave={(p) => { handleSaveSection(p); close(); }} onCancel={close} />
          )}
        />


        <Section
          title="Technik & Antrieb"
          rows={[
            { label: "Kraftstoff", value: vehicle.fuel },
            { label: "Getriebe", value: vehicle.transmission },
            { label: "Antrieb", value: vehicle.drive },
            { label: "Leistung", value: `${vehicle.power_kw} kW · ${vehicle.power_hp} PS` },
            { label: "Hubraum", value: vehicle.displacement_ccm ? `${vehicle.displacement_ccm} ccm` : undefined },
            { label: "Zylinder", value: vehicle.cylinders },
            { label: "Schadstoffklasse", value: vehicle.emissionClass },
            { label: "CO₂", value: vehicle.co2_g_km ? `${vehicle.co2_g_km} g/km` : undefined },
            { label: "Verbrauch", value: vehicle.consumption_l_100km ? `${vehicle.consumption_l_100km} l/100km` : undefined },
            { label: "Batterie", value: vehicle.batteryCapacity_kwh ? `${vehicle.batteryCapacity_kwh} kWh` : undefined },
            { label: "Reichweite", value: vehicle.range_km ? `${vehicle.range_km} km` : undefined },
          ]}
          renderEditor={(close) => (
            <TechEditor vehicle={vehicle} onSave={(p) => { handleSaveSection(p); close(); }} onCancel={close} />
          )}
        />

        <Section
          title="Innen & Außen"
          rows={[
            { label: "Außenfarbe", value: vehicle.color },
            { label: "Lackcode", value: vehicle.paintCode, mono: true },
            { label: "Metallic", value: vehicle.metallic === undefined ? undefined : (vehicle.metallic ? "Ja" : "Nein") },
            { label: "Innenfarbe", value: vehicle.interiorColor },
            { label: "Polster", value: vehicle.interiorMaterial },
            { label: "Türen", value: vehicle.doors },
            { label: "Sitze", value: vehicle.seats },
          ]}
          renderEditor={(close) => (
            <AppearanceEditor vehicle={vehicle} onSave={(p) => { handleSaveSection(p); close(); }} onCancel={close} />
          )}
        />

        <Section
          title="Zulassung & Historie"
          rows={[
            { label: "Kilometerstand", value: `${vehicle.mileage.toLocaleString("de-DE")} km` },
            { label: "Erstzulassung", value: vehicle.firstRegistration ? formatDate(vehicle.firstRegistration) : undefined },
            { label: "HU/TÜV bis", value: vehicle.hu ? formatDate(vehicle.hu) : undefined },
            { label: "Scheckheft", value: vehicle.serviceBookComplete === undefined ? undefined : (vehicle.serviceBookComplete ? "Komplett" : "Unvollständig") },
            { label: "Unfallfrei", value: vehicle.accidentFree === undefined ? undefined : (vehicle.accidentFree ? "Ja" : "Nein") },
            { label: "Nichtraucher", value: vehicle.nonSmoker === undefined ? undefined : (vehicle.nonSmoker ? "Ja" : "Nein") },
          ]}
          renderEditor={(close) => (
            <RegistrationEditor vehicle={vehicle} onSave={(p) => { handleSaveSection(p); close(); }} onCancel={close} />
          )}
        />

        <Section
          title="Preis & Status"
          rows={[
            { label: "Listenpreis (brutto)", value: formatCurrency(vehicle.listPrice) },
            { label: "Einkaufspreis (brutto)", value: formatCurrency(vehicle.purchasePrice) },
            { label: "MwSt. ausweisbar", value: vehicle.vatReportable === undefined ? undefined : (vehicle.vatReportable ? "Ja" : "Nein") },
            { label: "Status", value: vehicle.status },
            { label: "Im Bestand seit", value: vehicle.arrivedAt ? formatDate(vehicle.arrivedAt) : undefined },
            { label: "Notizen", value: vehicle.notes, full: true },
          ]}
          renderEditor={(close) => (
            <PriceEditor vehicle={vehicle} onSave={(p) => { handleSaveSection(p); close(); }} onCancel={close} />
          )}
        />

        <Section
          title="Ausstattung"
          rows={
            vehicle.features && vehicle.features.length > 0
              ? [{ label: "", value: <FeatureChips features={vehicle.features} />, full: true, raw: true }]
              : [{ label: "", value: "Keine Ausstattungsmerkmale erfasst.", full: true }]
          }
          renderEditor={(close) => (
            <FeaturesEditor vehicle={vehicle} onSave={(p) => { handleSaveSection(p); close(); }} onCancel={close} />
          )}
        />

        {/* ---------- Protokoll / Aktivitäten ---------- */}
        <ActivityLog items={vehicleActivities} title="Fahrzeug-Protokoll" />

      </div>

      {/* ---------- Dialoge ---------- */}
      <Dialog open={marketDialog} onOpenChange={setMarketDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Fahrzeugwert ermitteln</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2 overflow-y-auto pr-1">
            <div className="rounded-lg border border-border bg-background/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Automatische Marktwert-Recherche</p>
                  <p className="mt-1 font-display text-3xl font-bold text-foreground">
                    {formatCurrency(marketEstimate.midpoint)}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0",
                    marketResearchStarted ? "border-success/40 text-success" : "border-warning/40 text-warning",
                  )}
                >
                  {marketResearchStarted ? "Suchauftrag aktiv" : "bereit"}
                </Badge>
              </div>
              <p className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">Enge Wertspanne</p>
              <p className="mt-1 font-display text-3xl font-bold text-foreground">
                {formatCurrency(marketEstimate.min)} bis {formatCurrency(marketEstimate.max)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Die Recherche läuft automatisch mit deutschen Quellen, mobile.de-Priorität, Ausreißerfilter und den erfassten Fahrzeugdaten.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Modell</p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {vehicle.make} {vehicle.model}{vehicle.modelDetail ? ` ${vehicle.modelDetail}` : ""}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Baujahr</p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {marketSearch.year.min} bis {marketSearch.year.max}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {vehicle.firstRegistration ? `EZ ${formatDate(vehicle.firstRegistration)}` : `+/-${marketSearch.year.tolerance} Jahre`}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Modellpflege</p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {marketSearch.faceliftLabel ?? "Keine Regel hinterlegt"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Kilometer</p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {formatNumber(marketSearch.mileage.min)} bis {formatNumber(marketSearch.mileage.max)} km
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Leistung</p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {marketSearch.power ? `${marketSearch.power.minHp} bis ${marketSearch.power.maxHp} PS` : "Keine Angabe"}
                </p>
                {marketSearch.power && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    mobile.de: {marketSearch.power.minKw} bis {marketSearch.power.maxKw} kW
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Wertrelevante Ausstattung</p>
              {marketEstimate.equipmentLabels.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {marketEstimate.equipmentLabels.map((feature) => (
                    <Badge key={feature} className="bg-success/15 text-success border-success/30">
                      {feature}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-3">Suchmerkmale</p>
              {marketSearch.features.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {marketSearch.features.map((feature) => (
                    <Badge key={feature} variant="outline" className="border-border bg-background/40 text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">Noch keine Ausstattung am Fahrzeug hinterlegt.</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Automatisches Rechercheprofil</p>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Suchprofil</p>
                <p className="mt-1 max-h-10 overflow-hidden text-sm text-foreground">
                  {marketSearch.exactQuery}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Land</p>
                  <p className="text-sm font-medium text-foreground mt-1">Deutschland</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Quelle</p>
                  <p className="text-sm font-medium text-foreground mt-1">mobile.de priorisiert</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Bereinigung</p>
                  <p className="text-sm font-medium text-foreground mt-1">Fantasiepreise ignorieren</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Ausstattung</p>
                  <p className="text-sm font-medium text-foreground mt-1">{marketFilterCount} Merkmale geprÃ¼ft</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Ausstattung wird nicht komplett hart gefiltert, weil viele Inserate Extras nur in der Beschreibung nennen.
              </p>
            </div>

          </div>

          <DialogFooter className="shrink-0 pt-2">
            <Button variant="outline" onClick={() => setMarketDialog(false)}>Schließen</Button>
            <Button variant="outline" className="gap-1.5" onClick={recalculateMarketValue}>
              <History className="size-4" /> Neu ermitteln
            </Button>
            <Button className="bg-gradient-brand gap-1.5" onClick={openMarketSearches}>
              <Search className="size-4" /> Suchauftrag starten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={offerDialog} onOpenChange={setOfferDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neues Angebot anlegen</DialogTitle></DialogHeader>
          <NewOfferForm
            defaultPrice={vehicle.listPrice}
            customers={customers}
            onSubmit={(data) => {
              const created = addOffer({ ...data, vehicleId: vehicle.id, status: "draft" });
              toast.success("Angebot angelegt – jetzt Felder ausfüllen & senden.");
              setOfferDialog(false);
              navigate(`/angebote/${created.id}`);
            }}
            onCancel={() => setOfferDialog(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={directDialog} onOpenChange={setDirectDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Direkter Verkauf · Vorgang sofort starten</DialogTitle></DialogHeader>
          <DirectSaleForm
            defaultPrice={vehicle.listPrice}
            customers={customers}
            onSubmit={(data) => {
              const proc = startProcessForVehicle({ vehicleId: vehicle.id, ...data });
              if (proc) {
                toast.success(`Vorgang ${proc.id} gestartet · Angebot übersprungen.`);
                navigate(`/vorgaenge/${proc.id}`);
              }
              setDirectDialog(false);
            }}
            onCancel={() => setDirectDialog(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={locationDialog} onOpenChange={setLocationDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Standort ändern</DialogTitle></DialogHeader>
          <LocationForm
            locations={locations}
            currentName={vehicle.location.name}
            onSubmit={(loc) => {
              changeVehicleLocation(vehicle.id, loc);
              toast.success(`Standort: ${loc.name}`);
              setLocationDialog(false);
            }}
            onCancel={() => setLocationDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

// =========================================================================
// Section component — read-only by default, edit symbol toggles editor
// =========================================================================

type Row = { label: string; value?: React.ReactNode; mono?: boolean; full?: boolean; raw?: boolean };

const Section = ({
  title,
  rows,
  renderEditor,
  defaultOpen = false,
}: {
  title: string;
  rows: Row[];
  renderEditor: (close: () => void) => React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="bg-card border-border shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-left flex-1 min-w-0 group"
          aria-expanded={open}
        >
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform shrink-0",
              open ? "rotate-0" : "-rotate-90",
            )}
          />
          <h2 className="text-base font-display font-semibold group-hover:text-primary-glow transition-smooth">
            {title}
          </h2>
        </button>
        {open && (
          !editing ? (
            <Button variant="ghost" size="icon" className="size-8" aria-label={`${title} bearbeiten`} onClick={() => setEditing(true)}>
              <Edit2 className="size-3.5 text-muted-foreground" />
            </Button>
          ) : (
            <Badge variant="outline" className="border-primary/40 text-primary-glow">Bearbeitungsmodus</Badge>
          )
        )}
      </div>

      {open && (
        <div className="px-6 pb-6">
          {!editing ? (
            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
              {rows.map((r, i) => (
                <div key={i} className={cn("flex flex-col", r.full && "md:col-span-2 lg:col-span-3")}>
                  {r.label && (
                    <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{r.label}</dt>
                  )}
                  <dd className={cn("text-sm text-foreground mt-0.5 break-words", r.mono && "font-mono text-xs")}>
                    {r.value === undefined || r.value === null || r.value === ""
                      ? <span className="text-muted-foreground italic">—</span>
                      : (r.raw ? r.value : <>{r.value}</>)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            renderEditor(() => setEditing(false))
          )}
        </div>
      )}
    </Card>
  );
};

// =========================================================================
// Section editors — small controlled forms scoped per section
// =========================================================================

const Field = ({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) => (
  <div className={cn("space-y-1.5", full && "md:col-span-2 lg:col-span-3")}>
    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</Label>
    {children}
  </div>
);

const Selectbox = <T extends string>({
  value, onChange, options,
}: { value: T | undefined; onChange: (v: T | undefined) => void; options: readonly T[] }) => (
  <select
    value={value ?? ""}
    onChange={(e) => onChange((e.target.value || undefined) as T | undefined)}
    className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
  >
    <option value="">— bitte wählen —</option>
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

const FormActions = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => (
  <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-border">
    <Button variant="outline" onClick={onCancel} className="gap-1.5"><X className="size-3.5" /> Abbrechen</Button>
    <Button onClick={onSave} className="bg-gradient-brand gap-1.5"><Save className="size-3.5" /> Speichern</Button>
  </div>
);

// ---- Identification ----------------------------------------------------

const IdentificationEditor = ({ vehicle, onSave, onCancel }: { vehicle: Vehicle; onSave: (p: Partial<Vehicle>) => void; onCancel: () => void }) => {
  const [type, setType] = useState<VehicleType>(vehicle.type);
  const [make, setMake] = useState(vehicle.make);
  const [model, setModel] = useState(vehicle.model);
  const [modelDetail, setModelDetail] = useState(vehicle.modelDetail ?? "");
  const [year, setYear] = useState(vehicle.year);
  const [condition, setCondition] = useState<VehicleCondition | undefined>(vehicle.condition);
  const [vin, setVin] = useState(vehicle.vin);
  const [hsn, setHsn] = useState(vehicle.hsn ?? "");
  const [tsn, setTsn] = useState(vehicle.tsn ?? "");
  const [licensePlate, setLicensePlate] = useState(vehicle.licensePlate ?? "");
  const [previousOwners, setPreviousOwners] = useState<number | "">(vehicle.previousOwners ?? "");
  const [mileage, setMileage] = useState<number>(vehicle.mileage ?? 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Fahrzeugtyp">
        <select value={type} onChange={(e) => setType(e.target.value as VehicleType)} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm">
          {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="Marke"><Input value={make} onChange={(e) => setMake(e.target.value)} /></Field>
      <Field label="Modell"><Input value={model} onChange={(e) => setModel(e.target.value)} /></Field>
      <Field label="Modell-Details"><Input value={modelDetail} onChange={(e) => setModelDetail(e.target.value)} placeholder="z. B. M-Sport Paket" /></Field>
      <Field label="Baujahr"><Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></Field>
      <Field label="Zustand"><Selectbox value={condition} onChange={(v) => v && setCondition(v)} options={CONDITIONS} /></Field>
      <Field label="VIN" full><Input value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())} maxLength={17} className="font-mono" /></Field>
      <Field label="HSN"><Input value={hsn} onChange={(e) => setHsn(e.target.value)} maxLength={4} className="font-mono" /></Field>
      <Field label="TSN"><Input value={tsn} onChange={(e) => setTsn(e.target.value)} maxLength={3} className="font-mono" /></Field>
      <Field label="Kennzeichen"><Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value.toUpperCase())} className="font-mono" /></Field>
      <Field label="Vorbesitzer"><Input type="number" min={0} value={previousOwners} onChange={(e) => setPreviousOwners(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
      <Field label="Kilometerstand">
        <Input type="number" min={0} value={mileage || ""} onChange={(e) => setMileage(Number(e.target.value))} />
      </Field>
      <div className="md:col-span-2 lg:col-span-3">
        <FormActions
          onCancel={onCancel}
          onSave={() => onSave({
            type, make, model, modelDetail: modelDetail || undefined, year, condition, vin,
            hsn: hsn || undefined, tsn: tsn || undefined, licensePlate: licensePlate || undefined,
            previousOwners: previousOwners === "" ? undefined : Number(previousOwners),
            mileage,
          })}
        />
      </div>
    </div>
  );
};

// ---- Tech ---------------------------------------------------------------

const TechEditor = ({ vehicle, onSave, onCancel }: { vehicle: Vehicle; onSave: (p: Partial<Vehicle>) => void; onCancel: () => void }) => {
  const [fuel, setFuel] = useState<FuelType>(vehicle.fuel);
  const [transmission, setTransmission] = useState<Transmission>(vehicle.transmission);
  const [drive, setDrive] = useState<DriveType | undefined>(vehicle.drive);
  const [hp, setHp] = useState(vehicle.power_hp);
  const [displacement, setDisplacement] = useState<number | "">(vehicle.displacement_ccm ?? "");
  const [cylinders, setCylinders] = useState<number | "">(vehicle.cylinders ?? "");
  const [emission, setEmission] = useState<EmissionClass | undefined>(vehicle.emissionClass);
  const [co2, setCo2] = useState<number | "">(vehicle.co2_g_km ?? "");
  const [consumption, setConsumption] = useState<number | "">(vehicle.consumption_l_100km ?? "");
  const [battery, setBattery] = useState<number | "">(vehicle.batteryCapacity_kwh ?? "");
  const [range, setRange] = useState<number | "">(vehicle.range_km ?? "");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Kraftstoff">
        <select value={fuel} onChange={(e) => setFuel(e.target.value as FuelType)} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm">
          {FUELS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </Field>
      <Field label="Getriebe">
        <select value={transmission} onChange={(e) => setTransmission(e.target.value as Transmission)} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm">
          {TRANSMISSIONS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </Field>
      <Field label="Antrieb"><Selectbox value={drive} onChange={(v) => setDrive(v)} options={DRIVES} /></Field>
      <Field label="Leistung (PS)"><Input type="number" value={hp || ""} onChange={(e) => setHp(Number(e.target.value))} /></Field>
      <Field label="Hubraum (ccm)"><Input type="number" value={displacement} onChange={(e) => setDisplacement(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
      <Field label="Zylinder"><Input type="number" value={cylinders} onChange={(e) => setCylinders(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
      <Field label="Schadstoffklasse"><Selectbox value={emission} onChange={(v) => setEmission(v)} options={EMISSIONS} /></Field>
      <Field label="CO₂ (g/km)"><Input type="number" value={co2} onChange={(e) => setCo2(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
      <Field label="Verbrauch (l/100km)"><Input type="number" step="0.1" value={consumption} onChange={(e) => setConsumption(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
      <Field label="Batterie (kWh)"><Input type="number" value={battery} onChange={(e) => setBattery(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
      <Field label="Reichweite (km)"><Input type="number" value={range} onChange={(e) => setRange(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
      <div className="md:col-span-2 lg:col-span-3">
        <FormActions
          onCancel={onCancel}
          onSave={() => onSave({
            fuel, transmission, drive,
            power_hp: hp, power_kw: Math.round(hp * 0.7355),
            displacement_ccm: displacement === "" ? undefined : Number(displacement),
            cylinders: cylinders === "" ? undefined : Number(cylinders),
            emissionClass: emission,
            co2_g_km: co2 === "" ? undefined : Number(co2),
            consumption_l_100km: consumption === "" ? undefined : Number(consumption),
            batteryCapacity_kwh: battery === "" ? undefined : Number(battery),
            range_km: range === "" ? undefined : Number(range),
          })}
        />
      </div>
    </div>
  );
};

// ---- Appearance ---------------------------------------------------------

const AppearanceEditor = ({ vehicle, onSave, onCancel }: { vehicle: Vehicle; onSave: (p: Partial<Vehicle>) => void; onCancel: () => void }) => {
  const [color, setColor] = useState(vehicle.color);
  const [paintCode, setPaintCode] = useState(vehicle.paintCode ?? "");
  const [metallic, setMetallic] = useState<boolean | undefined>(vehicle.metallic);
  const [interiorColor, setInteriorColor] = useState(vehicle.interiorColor ?? "");
  const [interiorMaterial, setInteriorMaterial] = useState(vehicle.interiorMaterial ?? "");
  const [doors, setDoors] = useState<number | "">(vehicle.doors ?? "");
  const [seats, setSeats] = useState<number | "">(vehicle.seats ?? "");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Außenfarbe"><Input value={color} onChange={(e) => setColor(e.target.value)} /></Field>
      <Field label="Lackcode"><Input value={paintCode} onChange={(e) => setPaintCode(e.target.value)} className="font-mono" /></Field>
      <Field label="Metallic">
        <Selectbox value={metallic === undefined ? undefined : metallic ? "Ja" : "Nein"} onChange={(v) => setMetallic(v === "Ja")} options={["Ja", "Nein"] as const} />
      </Field>
      <Field label="Innenfarbe"><Input value={interiorColor} onChange={(e) => setInteriorColor(e.target.value)} /></Field>
      <Field label="Polster"><Input value={interiorMaterial} onChange={(e) => setInteriorMaterial(e.target.value)} placeholder="z. B. Leder, Stoff" /></Field>
      <Field label="Türen"><Input type="number" value={doors} onChange={(e) => setDoors(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
      <Field label="Sitze"><Input type="number" value={seats} onChange={(e) => setSeats(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
      <div className="md:col-span-2 lg:col-span-3">
        <FormActions
          onCancel={onCancel}
          onSave={() => onSave({
            color, paintCode: paintCode || undefined, metallic,
            interiorColor: interiorColor || undefined,
            interiorMaterial: interiorMaterial || undefined,
            doors: doors === "" ? undefined : Number(doors),
            seats: seats === "" ? undefined : Number(seats),
          })}
        />
      </div>
    </div>
  );
};

// ---- Registration -------------------------------------------------------

const RegistrationEditor = ({ vehicle, onSave, onCancel }: { vehicle: Vehicle; onSave: (p: Partial<Vehicle>) => void; onCancel: () => void }) => {
  const [mileage, setMileage] = useState(vehicle.mileage);
  const [firstReg, setFirstReg] = useState(vehicle.firstRegistration ?? "");
  const [hu, setHu] = useState(vehicle.hu ?? "");
  const [serviceBook, setServiceBook] = useState<boolean | undefined>(vehicle.serviceBookComplete);
  const [accidentFree, setAccidentFree] = useState<boolean | undefined>(vehicle.accidentFree);
  const [nonSmoker, setNonSmoker] = useState<boolean | undefined>(vehicle.nonSmoker);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Kilometerstand"><Input type="number" value={mileage || ""} onChange={(e) => setMileage(Number(e.target.value))} /></Field>
      <Field label="Erstzulassung"><Input type="date" value={firstReg} onChange={(e) => setFirstReg(e.target.value)} /></Field>
      <Field label="HU/TÜV bis"><Input type="date" value={hu} onChange={(e) => setHu(e.target.value)} /></Field>
      <Field label="Scheckheft komplett">
        <Selectbox value={serviceBook === undefined ? undefined : serviceBook ? "Ja" : "Nein"} onChange={(v) => setServiceBook(v === "Ja")} options={["Ja", "Nein"] as const} />
      </Field>
      <Field label="Unfallfrei">
        <Selectbox value={accidentFree === undefined ? undefined : accidentFree ? "Ja" : "Nein"} onChange={(v) => setAccidentFree(v === "Ja")} options={["Ja", "Nein"] as const} />
      </Field>
      <Field label="Nichtraucher">
        <Selectbox value={nonSmoker === undefined ? undefined : nonSmoker ? "Ja" : "Nein"} onChange={(v) => setNonSmoker(v === "Ja")} options={["Ja", "Nein"] as const} />
      </Field>
      <div className="md:col-span-2 lg:col-span-3">
        <FormActions
          onCancel={onCancel}
          onSave={() => onSave({
            mileage, firstRegistration: firstReg || undefined, hu: hu || undefined,
            serviceBookComplete: serviceBook, accidentFree, nonSmoker,
          })}
        />
      </div>
    </div>
  );
};

// ---- Price --------------------------------------------------------------

const PriceEditor = ({ vehicle, onSave, onCancel }: { vehicle: Vehicle; onSave: (p: Partial<Vehicle>) => void; onCancel: () => void }) => {
  const [listPrice, setListPrice] = useState(vehicle.listPrice);
  const [purchasePrice, setPurchasePrice] = useState(vehicle.purchasePrice);
  // Default: Gebrauchtfahrzeuge → Differenzbesteuerung (§ 25a UStG)
  const defaultMargin = vehicle.condition !== "Neu" && vehicle.condition !== "Tageszulassung";
  const [vatReportable, setVatReportable] = useState<boolean>(vehicle.vatReportable ?? !defaultMargin);
  const [notes, setNotes] = useState(vehicle.notes ?? "");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Listenpreis brutto (EUR)"><Input type="number" value={listPrice || ""} onChange={(e) => setListPrice(Number(e.target.value))} /></Field>
      <Field label="Einkaufspreis brutto (EUR)"><Input type="number" value={purchasePrice || ""} onChange={(e) => setPurchasePrice(Number(e.target.value))} /></Field>
      <Field label="Besteuerung">
        <Selectbox
          value={vatReportable === false ? "Differenzbesteuerung (§ 25a UStG)" : "Regelbesteuerung (19% MwSt.)"}
          onChange={(v) => setVatReportable(v === "Regelbesteuerung (19% MwSt.)")}
          options={["Differenzbesteuerung (§ 25a UStG)", "Regelbesteuerung (19% MwSt.)"] as const}
        />
      </Field>
      <Field label="Notizen" full>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-input bg-background/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </Field>
      <div className="md:col-span-2 lg:col-span-3">
        <FormActions
          onCancel={onCancel}
          onSave={() => onSave({ listPrice, purchasePrice, vatReportable, notes: notes || undefined })}
        />
      </div>
    </div>
  );
};

// ---- Features -----------------------------------------------------------

const FeatureChips = ({ features }: { features: string[] }) => (
  <div className="flex flex-wrap gap-1.5">
    {features.map((f, i) => (
      <Badge key={i} variant="outline" className="border-border bg-background/40 text-xs">
        <Sparkles className="size-3 mr-1" /> {f}
      </Badge>
    ))}
  </div>
);

const FeaturesEditor = ({ vehicle, onSave, onCancel }: { vehicle: Vehicle; onSave: (p: Partial<Vehicle>) => void; onCancel: () => void }) => {
  const [list, setList] = useState<string[]>(vehicle.features ?? []);
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    setList((l) => [...l, v]);
    setDraft("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="z. B. Navigationssystem, Sitzheizung, …"
        />
        <Button onClick={add} variant="outline" className="gap-1.5"><Plus className="size-3.5" /> Hinzufügen</Button>
      </div>
      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground">Noch keine Ausstattung erfasst.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {list.map((f, i) => (
            <Badge key={i} variant="outline" className="border-border bg-background/40 text-xs gap-1.5">
              {f}
              <button type="button" onClick={() => setList((l) => l.filter((_, idx) => idx !== i))} className="hover:text-destructive">
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <FormActions
        onCancel={onCancel}
        onSave={() => onSave({ features: list.length > 0 ? list : undefined })}
      />
    </div>
  );
};

// =========================================================================
// Dialog forms
// =========================================================================

const NewOfferForm = ({
  defaultPrice, onSubmit, onCancel,
}: {
  defaultPrice: number;
  customers: { id: string; name: string; city: string }[];
  onSubmit: (d: { customerId: string; price: number; validUntil: string }) => void;
  onCancel: () => void;
}) => {
  const [customerId, setCustomerId] = useState("");
  const [price, setPrice] = useState(defaultPrice);
  const validDefault = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const [validUntil, setValidUntil] = useState(validDefault);
  const valid = customerId && price > 0 && validUntil;

  return (
    <>
      <div className="space-y-3 py-2">
        <CustomerQuickSelect value={customerId} onChange={setCustomerId} required />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Angebotspreis (EUR) *</Label>
            <Input type="number" value={price || ""} onChange={(e) => setPrice(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Gültig bis *</Label>
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Abbrechen</Button>
        <Button disabled={!valid} className="bg-gradient-brand" onClick={() => onSubmit({ customerId, price, validUntil })}>
          <ArrowRight className="size-4 mr-1.5" /> Anlegen & ausfüllen
        </Button>
      </DialogFooter>
    </>
  );
};

const DirectSaleForm = ({
  defaultPrice, onSubmit, onCancel,
}: {
  defaultPrice: number;
  customers: { id: string; name: string; city: string }[];
  onSubmit: (d: { customerId: string; price: number }) => void;
  onCancel: () => void;
}) => {
  const [customerId, setCustomerId] = useState("");
  const [price, setPrice] = useState(defaultPrice);
  const valid = customerId && price > 0;

  return (
    <>
      <div className="space-y-3 py-2">
        <p className="text-xs text-muted-foreground bg-info/10 border border-info/30 rounded-md p-3">
          Du überspringst das Angebot und startest sofort einen Vorgang ab Schritt „Anzahlung". Geeignet, wenn du dich mit dem Kunden mündlich geeinigt hast.
        </p>
        <CustomerQuickSelect value={customerId} onChange={setCustomerId} required />
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Vereinbarter Preis (EUR) *</Label>
          <Input type="number" value={price || ""} onChange={(e) => setPrice(Number(e.target.value))} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Abbrechen</Button>
        <Button disabled={!valid} className="bg-gradient-brand" onClick={() => onSubmit({ customerId, price })}>
          <Zap className="size-4 mr-1.5" /> Vorgang starten
        </Button>
      </DialogFooter>
    </>
  );
};

const LocationForm = ({
  locations, currentName, onSubmit, onCancel,
}: {
  locations: string[];
  currentName: string;
  onSubmit: (loc: VehicleLocation) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(currentName);
  const [customName, setCustomName] = useState("");
  const [kind, setKind] = useState<LocationKind>("lot");
  const [note, setNote] = useState("");
  const finalName = name === "__custom__" ? customName.trim() : name;
  const valid = finalName.length > 0;

  return (
    <>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Stellplatz / Standort *</Label>
          <select value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm">
            {locations.map((l) => <option key={l} value={l}>{l}</option>)}
            <option value="__custom__">— Eigener Standort —</option>
          </select>
          {name === "__custom__" && (
            <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="z. B. Werkstatt Müller" />
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Art</Label>
          <select value={kind} onChange={(e) => setKind(e.target.value as LocationKind)} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm">
            {Object.entries(LOCATION_KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Notiz</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Abbrechen</Button>
        <Button disabled={!valid} className="bg-gradient-brand" onClick={() => onSubmit({
          name: finalName, kind, since: new Date().toISOString(), note: note || undefined,
        })}>
          Standort übernehmen
        </Button>
      </DialogFooter>
    </>
  );
};

export default VehicleDetail;
