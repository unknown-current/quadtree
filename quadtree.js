class QuadTree {

  constructor(x, y, width, height, capacity) {
    this.width = width; // width of quadtree area
    this.height = height; // height of quadtree area
    this.capacity = capacity; // amount of points to hold in each section
    this.subdivided = false;
    this.points = [];

    // set center of tree
    this.x = x;
    this.y = y;

    // declare subdivisions
    this.nw = null;
    this.ne = null;
    this.sw = null;
    this.se = null;

    // corners of this node
    this.leftx = this.x - this.width / 2;
    this.rightx = this.x + this.width / 2;
    this.topy = this.y - this.width / 2;
    this.bottomy = this.y + this.width / 2;
  }

  build(points) {
    for (let p of points)
      this.insert(p);
  }

  toArray() {
    let points = this.points;

    // check child nodes for overlap
    if (this.subdivided) {
      points = points.concat(this.nw.toArray());
      points = points.concat(this.ne.toArray());
      points = points.concat(this.sw.toArray());
      points = points.concat(this.se.toArray());
    }

    return points;
  }

  contains(point) {
    return point.x <= this.x + this.width / 2 &&
           point.x >= this.x - this.width / 2 &&
           point.y <= this.y + this.height / 2 &&
           point.y >= this.y - this.height / 2;
  }

  subdivide() {
    if (this.subdivided) return;
    // initialize subdivisions
    this.nw = new QuadTree(this.x - this.width / 4, this.y - this.height / 4,
                           this.width / 2, this.height / 2, this.capacity);
    this.ne = new QuadTree(this.x + this.width / 4, this.y - this.height / 4,
                           this.width / 2, this.height / 2, this.capacity);
    this.sw = new QuadTree(this.x - this.width / 4, this.y + this.height / 4,
                           this.width / 2, this.height / 2, this.capacity);
    this.se = new QuadTree(this.x + this.width / 4, this.y + this.height / 4,
                           this.width / 2, this.height / 2, this.capacity);
    for (let i = 0; i < this.capacity; i++) {
      let p = this.points.pop();
      if (p == null) break;
      this.nw.insert(p);
      this.ne.insert(p);
      this.sw.insert(p);
      this.se.insert(p);
    }
    this.subdivided = true;
  }

  insert(point) {
    // only insert if point is within this node
    if (!this.contains(point))
      return;

    if (this.points.length >= this.capacity || this.subdivided) {
      if (!this.subdivided)
        this.subdivide();

      // try inserting point in each subdivision
      this.nw.insert(point);
      this.ne.insert(point);
      this.sw.insert(point);
      this.se.insert(point);
    } else {
      this.points.push(point);
    }
    // console.log("FAILURE");
  }

  clearTree() {
    this.points = [];
    if (this.nw) {
      this.nw.clearTree();
      this.nw = null;
    }
    if (this.ne) {
      this.ne.clearTree();
      this.ne = null;
    }
    if (this.sw) {
      this.sw.clearTree();
      this.sw = null;
    }
    if (this.se) {
      this.se.clearTree();
      this.se = null;
    }
    this.subdivided = false;
  }

  pointLineDist(px, py, x1, y1, x2, y2) {
    return abs((x2 - x1) * (y1 - py) - (x1 - px) * (y2 - y1)) / dist(x1, y1, x2, y2);
  }

  overlapsCircle(c) {
    // circle's center is within rectangle
    if (this.contains(c))
      return true;

    // top line
    if (this.pointLineDist(c.x, c.y, this.leftx, this.topy, this.rightx, this.topy) < c.radius)
      return true;

    // left line
    if (this.pointLineDist(c.x, c.y, this.leftx, this.bottomy, this.leftx, this.topy) < c.radius)
      return true;

    // right line
    if (this.pointLineDist(c.x, c.y, this.rightx, this.bottomy, this.rightx, this.topy) < c.radius)
      return true;

    // bototm line
    if (this.pointLineDist(c.x, c.y, this.leftx, this.bottomy, this.rightx, this.bottomy) < c.radius)
      return true;

    return false;
  }

  pointsWithinCircle(c) {
    if (!this.overlapsCircle(c))
      return [];

    // check this node's points for overlap
    let points = [];
    for (let p of this.points) {
      if (c.contains(p))
        points.push(p);
    }

    // check child nodes for overlap
    if (this.nw) points = points.concat(this.nw.pointsWithinCircle(c));
    if (this.ne) points = points.concat(this.ne.pointsWithinCircle(c));
    if (this.sw) points = points.concat(this.sw.pointsWithinCircle(c));
    if (this.se) points = points.concat(this.se.pointsWithinCircle(c));

    return points;
  }

  overlapsRect(r) {
    if (r.x - r.width / 2 > this.x + this.width / 2 || r.x + r.width / 2 < this.x - this.width / 2)
      return false;

    if (r.y - r.height / 2 > this.y + this.height / 2 || r.y + r.height / 2 < this.y - this.height / 2)
      return false;

    return true;
  }

  pointsWithinRect(r) {
    if (!this.overlapsRect(r))
      return [];

    // check this node's points for overlap
    let points = [];
    for (let p of this.points) {
      if (r.contains(p))
        points.push(p);
    }

    // check child nodes for overlap
    if (this.subdivided) {
      points = points.concat(this.nw.pointsWithinRect(r));
      points = points.concat(this.ne.pointsWithinRect(r));
      points = points.concat(this.sw.pointsWithinRect(r));
      points = points.concat(this.se.pointsWithinRect(r));
    }

    return points;
  }

  nearestPointsXY(x, y, n) {
    return this.nearestPoints(new Point(x, y), n);
  }

  nearestPoints(p, n) {
    let curNearest = null;
    let curDist = Infinity;
    let radius = 0;
    let cir;
    let foundPoints = [];

    do {
      radius += 10;
      cir = new Circle(p.x, p.y, radius);
      foundPoints = this.pointsWithinCircle(cir);
    } while (foundPoints.length <= n && radius < this.width);

    if (foundPoints.length == n)
      return foundPoints;

    curNearest = foundPoints[0];

    foundPoints.sort(function(a, b){return dist(a.x, a.y, p.y, p.y) - dist(b.x, b.y, p.x, p.y)});
    foundPoints.length = n;

    return foundPoints;
  }

  show() {
    for (let p of this.points)
      p.show();

    if (this.nw) this.nw.show();
    if (this.ne) this.ne.show();
    if (this.sw) this.sw.show();
    if (this.se) this.se.show();
  }

  visualize() {
    // visualize the quadtree with rectangles
    stroke(255);
    strokeWeight(1);
    noFill();
    rectMode(CENTER);
    rect(this.x, this.y, this.width, this.height);
    if (this.nw) this.nw.visualize();
    if (this.ne) this.ne.visualize();
    if (this.sw) this.sw.visualize();
    if (this.se) this.se.visualize();
  }

}
