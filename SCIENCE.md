# Scientific scope and limitations

## Direct calculations

A uniform-density spherical asteroid has volume πD³/6, mass ρV and incident kinetic energy mv²/2. D is in meters, density in kg/m³ and velocity in m/s. The UI accepts km/s and converts explicitly. One ton TNT is defined here as 4.184e9 J. Angle does not change the total incident energy; it enters crater scaling. No atmospheric energy losses are calculated.

The sensitivity envelope changes diameter by ±20% and speed by ±10%, keeping density fixed. It is not a statistical confidence interval. Nuclear energy conversions do not use asteroid density, dimensions or speed.

## Conditional land craters

Selected scaling relationships from Collins, Melosh & Marcus (2005), *Meteoritics & Planetary Science* 40, 817–840, DOI https://doi.org/10.1111/j.1945-5100.2005.tb00157.x:

D_t = 1.161 (ρ_i/ρ_t)^(1/3) D^0.78 v^0.44 g^(-0.22) sin(θ)^(1/3).

The final simple-crater estimate is 1.25 D_t; above the simple/complex transition (1.25 D_t ≥ 3,200 m), use 1.17 D_t^1.13 / 3200^0.13. Units are SI; g=9.81 m/s². This is only a conditional submodel, not a reproduction of the complete published impact-effects program.

Crater output is withheld for diameter below 50 m or above 20 km, angle below 15°, and ocean scenarios. These are conservative software applicability bounds, not claims of validation. Atmospheric fragmentation, deceleration, strength effects, target layering, porosity and the collapse process add substantial uncertainty. No exact final crater depth is predicted.

Small iron bodies can reach the ground, while small rocky bodies can fragment; this app does not solve which outcome occurs. In particular, the Tunguska and Chelyabinsk presets must not be read as predictions of a crater or airburst height. Historical analogue parameters are illustrative and sometimes highly uncertain. The coastal Chesapeake and Chicxulub examples do not reconstruct ancient sea level or geology.

## Ocean travel visualization

NOAA describes long-wave speed as c=√(gh): https://www.noaa.gov/jetstream/tsunamis/tsunami-propagation.

The app uses uniform depth, straight great-circle rays, 3° bearing spacing and 25 km land-intersection sampling, to a maximum distance of 5,000 km. Wavefronts are ocean-masked and rays stop when sampled land is found. The inner two rings are visual phase guides. They do not represent computed wave periods or energies. Small islands and barriers can be missed. There is no bathymetry, dispersion, refraction or diffraction.

π(D/2)² min(D,h) is displayed only as a geometric swept-water cylinder volume; it is **not** a solved cavity volume or initial tsunami displacement. Wave amplitude, crest-to-trough height, coastal run-up and inundation are separate quantities; none is predicted.

## Earth geometry and geography

A sphere of radius 6,371.0088 km is used for distances and circles. D3 clips geographic shapes at the antimeridian. Equirectangular projection distorts displayed sizes toward the poles, but radius is generated on the sphere, not measured as a flat-screen pixel circle. Earth is not a perfect sphere; this is not a surveying application.

Natural Earth 1:110m geography is bundled from world-atlas. Coastline and small-island accuracy are limited. Borders are cartographic data, not a political endorsement. Offline city coordinates form a small curated index, not a comprehensive gazetteer.

## Nuclear references

Nuclear scenarios are energy comparisons only. There are no burst-height, blast, thermal, fallout or fireball outputs. Historical reference yields are approximate and may differ among assessments. Ivy Mike reference: https://www.energy.gov/management/october-31-1952-mike-test. Tsar Bomba context: https://www.norsar.no/nyheter/60-ar-etter-provesprengningen-av-tsar-bomba. Trinity uses the familiar nominal 21 kt reference, not a claim of an exact measurement.

## Not modeled

- Atmospheric entry trajectory, ablation, breakup and airburst altitude.
- Quantitative ejecta thickness/distribution, thermal fluence, shock overpressure or seismic shaking.
- Event frequency, global dust/climate consequences, ocean vaporization or planetary disruption.
- Casualties, damage to specific buildings, emergency guidance or coastal inundation.

Finite numerical output at a very large diameter does not imply physically reliable regional-effect predictions. Only incident mass/energy remain displayed outside the crater model domain.
