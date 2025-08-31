### 1. Install system GIS libraries

GeoDjango depends on GDAL, GEOS, PROJ and optionally PostGIS. On Ubuntu/Debian:

``` bash
sudo apt update
sudo apt install binutils libproj-dev gdal-bin postgis
```

On macOS with Homebrew:

``` bash
brew install geos gdal proj postgis
```

### 2. Install Python dependencies
In your virtualenv, add:

``` bash
pip install psycopg2-binary         # PostgreSQL driver
pip install django                  # if not already
pip install djangorestframework
pip install djangorestframework-gis  # for geo‐serializers
```


### 3. Create a PostGIS‐enabled database
In psql (or via pgAdmin):

``` bash
CREATE DATABASE myrealestate;
\c myrealestate
CREATE EXTENSION postgis;
```


### 4. Configure settings.py

``` bash
INSTALLED_APPS += [
    "django.contrib.gis",         # GeoDjango core
    "rest_framework_gis",         # optional, for GIS serializers
]

# Change the Engine
DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME":     "myrealestate",
        "USER":     "your_pg_user",
        "PASSWORD": "•••",
        "HOST":     "localhost",
        "PORT":     "5432",
    }
}
```

### 5. Update your Property model
Replace your two decimal fields or add:

``` py
from django.contrib.gis.db import models as gis_models

class Property(models.Model):
    # … existing fields …
    location = gis_models.PointField(
        srid=4326,            # WGS84
        geography=True,       # lets you do true‐distance queries
        null=True, blank=True
    )
```


### 6. Make & run migrations

``` py
python manage.py makemigrations
python manage.py migrate
```

Django will create a spatial index on location automatically.



### 7. Populate location data
Whenever you save a property (in admin, DRF, shell, etc.):

``` py
from django.contrib.gis.geos import Point
prop = Property.objects.create( … )
prop.location = Point(longitude, latitude)  # note: (x, y) = (lon, lat)
prop.save()
```
You can geocode addresses via any service (Nominatim, Google Geocoding API) to get those two numbers.



### 8. Expose geo in your API
Install and add rest_framework_gis to INSTALLED_APPS. Then in your serializer:

``` py
from rest_framework_gis.serializers import GeoFeatureModelSerializer

class PropertyGeoSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Property
        geo_field = "location"
        fields = ["id", "name", "status", /*…*/]
```
This returns GeoJSON so your frontend can plot directly.

Or, with plain DRF:

``` py
class PropertySerializer(serializers.ModelSerializer):
    longitude = serializers.FloatField(source="location.x", read_only=True)
    latitude  = serializers.FloatField(source="location.y", read_only=True)

    class Meta:
        model = Property
        fields = ["id", "name", "latitude", "longitude", /*…*/]
```


### 9. “Find nearby” in views
Use GeoDjango lookups + filters:

``` py
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D
from django_filters.rest_framework import FilterSet, DjangoFilterBackend

class PropertyGeoFilter(FilterSet):
    # `nearby` expects ?lat=…&lng=…&radius= in km
    lat    = django_filters.NumberFilter(method="filter_nearby")
    lng    = django_filters.NumberFilter(method="filter_nearby")
    radius = django_filters.NumberFilter(method="filter_nearby")

    class Meta:
        model = Property
        fields = []

    def filter_nearby(self, queryset, name, value):
        lat = self.data.get("lat")
        lng = self.data.get("lng")
        r   = self.data.get("radius")
        if not (lat and lng and r):
            return queryset
        user_loc = Point(float(lng), float(lat), srid=4326)
        return (
            queryset
            .filter(location__distance_lte=(user_loc, D(km=float(r))))
            .annotate(distance=Distance("location", user_loc))
            .order_by("distance")
        )
```
And in your view:

``` py
class NearbyProperties(ListAPIView):
    queryset = Property.objects.filter(is_deleted=False)
    serializer_class   = PropertySerializer  # or GeoSerializer
    filter_backends    = [DjangoFilterBackend]
    filterset_class    = PropertyGeoFilter
    pagination_class   = CustomPageNumberPagination
```

Call it like:

```
GET /properties/?lat=40.7&lng=-74.0&radius=5
```

### 10.  Front-end in Next.js
Fetch that endpoint, then feed the resulting coords into Leaflet or Mapbox as shown before. If you used GeoJSON:

``` js
import { GeoJSON } from 'react-leaflet';
<GeoJSON data={geojsonFeatureCollection} />
```

That’s all!

1. Install GIS libs & PostGIS
2. Switch to the PostGIS backend and add PointField
3. Migrate & load your lat/lng
4. Expose via DRF (GeoJSON or simple floats)
5. Use GeoDjango lookups to “find nearby”
6. Plot on your Next.js map

You’ll now have full “find properties within X km” and any other spatial query you need—no hacks, just GeoDjango.


### GEO FILETRS

``` py
GET /projects/1234-abcd/properties/geo/
?name=estate
&status=for_sale
&lat=40.7128
&lng=-74.0060
&radius=2
&bbox=-74.01,40.71,-74.00,40.72
```



### GEO NextJS PACKAGES

Thought for a couple of seconds


You’ve got a few really solid, battle-tested options for drawing shapes (boxes, circles, polygons), highlighting areas, and applying filters right in your Next.js front-end. All of them plug into React nicely and can consume your GeoJSON straight from Django. Here are the top picks:

---

## 1. Leaflet + React-Leaflet + Leaflet.Draw

* **Core**: [Leaflet](https://leafletjs.com/) is lightweight, super-extensible, and has a huge ecosystem.
* **React binding**: [`react-leaflet`](https://react-leaflet.js.org/) lets you drop `<MapContainer>` and `<Marker>` components into your JSX.
* **Drawing**: [`leaflet-draw`](https://github.com/Leaflet/Leaflet.draw) (plus its React wrapper [`react-leaflet-draw`](https://github.com/alex3165/react-leaflet-draw)) gives you a toolbox for drawing rectangles, circles, polygons, markers, polylines, editing them, deleting them, etc.
* **Styling & filters**: you can listen for draw events, grab the shape’s geometry (bounds or circle center/radius), and re‐query your Geo endpoint with those params.

**Why?**

* Easiest to set up.
* Tons of plugins (heatmaps, clustering, geocoding).
* Zero cost.

---

## 2. Mapbox GL JS + React-Map-GL + Mapbox-GL-Draw

* **Core**: [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) brings GPU-accelerated rendering and style expressions.
* **React binding**: [`react-map-gl`](https://visgl.github.io/react-map-gl/) or [`react-mapbox-gl`](https://github.com/alex3165/react-mapbox-gl).
* **Drawing**: [`@mapbox/mapbox-gl-draw`](https://github.com/mapbox/mapbox-gl-draw) lets you draw/edit points, lines, polygons, with full control over style and modes.
* **Filtering**: style layers with `filter` expressions (e.g. `["all", ["==", "status", "available"], [">=", ["get","distance"], 5]]`).

**Why?**

* Slick vector styling, built-in clustering.
* Feels “modern” with high-performance pan/zoom.
* Comes with geocoder, directions plugins.

---

## 3. OpenLayers

* **Core**: [OpenLayers](https://openlayers.org/) is the granddaddy of web GIS—rich in out-of-the-box interactions.
* **Drawing**: use `ol/interaction/Draw`, `Modify`, `Select`, `Snap` to let users create/edit shapes.
* **Filtering**: powerful client-side filters via style functions or by subsetting your vector source.

**Why?**

* Best for heavy GIS use (CRS transforms, raster/vector mixing).
* Very granular control over every aspect of the map.

---

## 4. Deck.GL (for advanced visuals)

* **Core**: [deck.gl](https://deck.gl/) is a WebGL-powered layers framework from Uber.
* **Interactions**: combine with [`@deck.gl/layers`](https://deck.gl/docs/api-reference/layers) and [`@deck.gl/geo-layers`](https://deck.gl/docs/api-reference/geo-layers) to draw shapes and handle clicks/hover.
* **Filtering**: use its `updateTriggers` and layer props to re-render only data inside a drawn shape.

**Why?**

* Spectacular for large datasets (tens of thousands of points).
* Integrates with React, Mapbox, and even Google Maps.

---

## 5. Turf.js (spatial filtering library)

Regardless of which map you pick, [`turf`](https://turfjs.org/) is invaluable for client-side geo operations:

* **`turf.booleanPointInPolygon()`** for point-in-bbox or arbitrary polygon tests.
* **`turf.distance()`** to compute great-circle distances for “nearby” without hitting your server.
* **`turf.bboxPolygon()`** to construct a polygon from a bbox array.

Use it to pre-filter features before rendering or to build the query params you’ll send back to Django.

---

### Putting it all together

1. **Choose your map engine** (Leaflet if you want simple, Mapbox GL if you want GPU styling, OpenLayers for full GIS power).
2. **Install the React wrapper** (`react-leaflet`, `react-map-gl`, or just drop a `<div>` for OL).
3. **Add the drawing plugin** (`leaflet-draw` or `mapbox-gl-draw`, or OL’s draw interaction).
4. **Listen for events** (e.g. `draw:created`, `draw.update`, or Mapbox’s `draw.create`) to get the shape’s geometry.
5. **Pass that geometry** (bbox, circle center+radius, polygon coords) as query params to your GeoDjango endpoint.
6. **Render the response** (GeoJSON `FeatureCollection`) directly with your library’s GeoJSON layer functions.

That combo will give you on-map drawing, highlighting, filtering by any shape, and seamless integration with your Django backend’s GeoJSON output.
