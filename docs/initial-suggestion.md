Transcript from chat on 2026-04-18:

---

Start with a boring but workable pipeline, not with “AI solves everything”.

You have two separate problems:

1. detect and track vehicles in image space
2. map those detections into intersection space and infer signal phase/state

Treat them separately.

## 1. First get cars working in plain image coordinates

Do this before any top-down mapping.

Use:

* **detector**: YOLOv8/YOLO11, RT-DETR, or similar
* **tracker**: ByteTrack or BoT-SORT

At 1 Hz, this is easy. Even modest hardware can do much more than that.

Output per frame:

* bounding box
* class = car / truck / bus / motorcycle
* tracking id
* confidence

For road use, don’t use bbox center blindly. Use a **ground contact point**, usually:

* bottom-center of the box

That point is a much better approximation of where the vehicle touches the road.

## 2. Define the road plane and do a homography

If you want top-down positions, you need a mapping from image pixels to road coordinates.

For that, start with a **planar homography**.

You manually pick at least 4 points on the road surface in the image and match them to 4 points on a top-down reference map of the same intersection.

Examples of good points:

* zebra crossing corners
* lane marking corners
* stop line corners
* traffic island corners
* curb corners on the same road plane

Then compute:

* `H_img_to_map`
* optionally `H_map_to_img`

This lets you transform each vehicle ground point from image space into map space.

Important limitation:

* this only works well for points on the **road plane**
* tops of cars, poles, billboards, etc. will not map correctly
* so again: use the bottom-center wheel-contact approximation, not object center

## 3. Do not detect signal state from cars first

Directly detecting green/red from vehicle flow is fragile.

Instead, split traffic-light handling into two layers:

### Layer A: direct signal observation

For each visible signal head:

* define a small ROI manually
* crop it
* classify state: red / yellow / green / off / unknown

Because the lights are tiny in the frame, this is often easier than full generic detection:

* manually register each traffic light location once
* then do per-ROI classification

A very crude first version can even work with:

* HSV thresholding for red / yellow / green
* brightness check
* temporal smoothing

If camera angle and lighting vary a lot, train a tiny classifier on cropped ROIs instead.

### Layer B: phase/state machine

Since you said the intersection always cycles through the same pattern, use that.

Define allowed phases, for example:

* Phase A: north-south green, east-west red
* Phase B: north-south yellow
* Phase C: all red
* Phase D: east-west green
* ...

Then use:

* direct ROI observations
* timing constraints
* previous phase

to estimate current phase robustly.

This matters because direct light classification will occasionally fail due to:

* sun glare
* low resolution
* occlusion
* motion blur
* billboard reflections
* weather

A state machine cleans that up.

## 4. Use lane polygons, not just raw positions

Once vehicles are mapped to top-down coordinates, define:

* lane polygons
* stop line segments
* approach zones
* conflict zones

Then each tracked vehicle can be assigned to:

* incoming lane
* outgoing lane
* waiting queue
* moving through junction

That gives you useful features like:

* queue length per approach
* vehicles crossing stop line
* vehicles moving through on current phase
* red-light violators
* which approach likely has green even if light ROI is uncertain

## 5. Recommended architecture

### Stage 1 — Manual geometry setup

For one camera:

* draw road-plane correspondences
* compute homography
* draw lane polygons on top-down map
* mark traffic light ROIs in image
* define signal-phase graph

This is one-time setup per intersection/camera.

### Stage 2 — Per-frame runtime

For each frame:

1. run detector
2. run tracker
3. extract bottom-center of each vehicle box
4. transform point with homography to top-down map
5. assign vehicle to lane/zone
6. classify each traffic-light ROI
7. run phase estimator/state machine
8. emit structured state

Example output:

```json
{
  "timestamp": "2026-04-18T12:00:00Z",
  "vehicles": [
    {
      "track_id": 17,
      "class": "car",
      "image_point": [423, 612],
      "map_point": [18.2, 7.6],
      "lane_id": "westbound_left",
      "speed_mps": 3.1
    }
  ],
  "signals": {
    "sig_west_entry": "red",
    "sig_south_entry": "green"
  },
  "phase": "phase_D",
  "phase_confidence": 0.94
}
```

## 6. What I would build first

Not real-time. First just prove the geometry.

### Step 1

Take 20–50 frames from the same camera.

### Step 2

Manually annotate:

* a few road correspondences
* traffic light ROIs
* maybe 30–50 vehicle detections for sanity checking

### Step 3

Run YOLO on those frames.

### Step 4

Map bottom-center points into top-down coordinates.

### Step 5

Render debug overlay:

* original frame with boxes and IDs
* top-down map with transformed dots
* lane labels
* signal state text

If the top-down dots land in the correct lanes, you’re on track.
If they drift into sidewalks/buildings, your homography/setup is wrong.

## 7. Biggest practical gotchas

### Camera calibration drift

If the camera moves even slightly, homography breaks.

### Tiny traffic lights

In your image, some visible signal heads are very small. Generic object detection may be worse than manual ROIs + per-ROI classifier.

### Occlusion

Cars hide other cars. Tracking helps, but don’t expect perfect counts.

### Perspective compression

Far cars are tiny and harder to detect reliably.

### Night / rain / glare

You will probably need separate thresholds/models or at least temporal filtering.

### One homography is only for the road plane

Anything elevated will be wrong after mapping. That is expected.

## 8. What helps from your known light pattern

A lot.

It means you should not think of “detect each lamp independently forever”.
Think:

* observe noisy evidence from ROIs
* combine with legal phase transitions
* enforce minimum and maximum phase durations
* optionally use vehicle behavior as secondary evidence

That turns a flaky CV problem into a much easier tracking/state-estimation problem.

A simple version:

* current phase
* time entered phase
* allowed next phases
* ROI evidence likelihood
* transition only if evidence is strong enough or timing window matches

Even a hand-written finite-state machine can work well.

## 9. Minimal tech stack

Python/OpenCV is the fastest way to prototype.

Good baseline:

* OpenCV
* Ultralytics YOLO
* ByteTrack
* NumPy
* Shapely for lane polygons
* optional: supervision for easy CV utilities

## 10. Order of implementation

Best order is:

1. **vehicle detection**
2. **tracking**
3. **homography to top-down**
4. **lane polygons / stop lines**
5. **manual traffic-light ROIs**
6. **signal ROI classification**
7. **phase state machine**
8. **real-time loop + debug UI**

Not the other way around.

## 11. Real-time at 1 Hz

1 Hz is very achievable.

Even with:

* one detector pass per frame
* one tracker update
* a few traffic-light ROI checks
* homography transform
* state machine

this is lightweight.

If you later want more stability, process at 5–10 Hz internally and publish aggregated state at 1 Hz.

That is better than literally running once per second, because:

* tracking is smoother
* phase transitions are caught more reliably
* missed detections hurt less

## 12. The simplest correct first milestone

Ignore automatic traffic light inference for a moment.

Build a demo that:

* detects cars
* tracks them
* projects them onto a static top-down map
* shows which lane each car belongs to

Once that works, add:

* fixed ROIs for traffic lights
* a state machine using known cycle order

That is the sane starting point.

If you want, I can sketch the exact data model and a first OpenCV + YOLO prototype structure for this pipeline.
