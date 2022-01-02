// copy your physics-based animation code from lab 9 here
// (you don't have to, but it might keep things a bit more organized)
function Point(x,mass) {
  this.current  = x.slice(); // vec2
  this.previous = x.slice(); // vec2
  this.mass     = mass;      // mass at this point
  this.inverse_mass = 1./mass; // saves repeated divisions during simulation
  this.dt = 5e-3; // time step
  this.fext = vec2.fromValues(0.7,-9.81*mass); // external force (downwards force of gravity)
}

Point.prototype.move = function() {
  /**
   * Moves the point according to the external force (stored in this.fext).
   * @returns nothing but (1) sets this.previous to be the old coordinate (this.current)
   *  and (2) updates this.current to the new location using the formula below.
   *
   * recall the formula is: x^{k+1} = 2*x^k - x^{k-1} + fext*dt^2/m
   * here: fext    = this.fext (vec2)
   *       x^k     = this.current (vec2)
   *       x^{k-1} = this.previous (vec2)
   *       dt      = this.dt (scalar)
   *       m       = this.mass (scalar)
   */

  let updated_position = vec2.create();
  vec2.scale(updated_position, this.current, 2);
  vec2.subtract(updated_position, updated_position,this.previous);

  let force_term = vec2.create();
  vec2.scale(force_term, this.fext, this.dt);
  vec2.scale(force_term, force_term, this.dt);
  vec2.scale(force_term, force_term, this.inverse_mass);
  
  vec2.add(updated_position, updated_position, force_term);

  this.previous = this.current.slice();
  this.current = updated_position.slice();
}

function Constraint(p,q) {
  this.p = p; // a Point object above, which has coordinates this.p.current (a vec2)
  this.q = q; // a Point object above, which has coordinates this.q.current (a vec2)
  this.rest_length = vec2.distance( p.current , q.current ); // scalar rest length of the spring
}

Constraint.prototype.satisfy = function() {
  /**
   * Attempts to satisfy the constraints on this edge
   * by restoring the spring to its rest_length.
   * this.p and this.q are both Point objects which store 'current' coordinates (vec2) and mass (scalar)
   * Your job is to update the 'current' coordinates using the formula in the reading notes (see the pseudocode for the constraint update). DO NOT the previous coordinates.
   * @returns nothing, but edge endpoint coordinates (this.p.current and this.q.current are updated, both are vec2's)
   *
   * notation in the notes:
   *    L0 = this.rest_length (scalar)
   *    p0 = this.p.current (vec2)
   *    p1 = this.q.current (vec2)
   *    m0 = this.p.mass (or 1/m0 = this.p.inverse_mass)
   *    m1 = this.q.mass (or 1/m1 = this.q.inverse_mass)
  **/
	let delta = (vec2.distance(this.q.current, this.p.current) - this.rest_length)/vec2.distance(this.q.current, this.p.current); // p0 and p1 are the constraint (edge) endpoint coordinates (vectors)
	let dx = vec2.create();
	vec2.sub(dx, this.q.current, this.p.current);
  vec2.scale(dx, dx, delta); 

	let mt = this.p.mass * this.q.mass / (this.p.mass + this.q.mass); // m0 and m1 are the masses of particles p0 and p1
	let temp = vec2.create();
	vec2.add(this.p.current, this.p.current, vec2.scale(temp, dx, mt*this.p.inverse_mass));
	vec2.sub(this.q.current, this.q.current, vec2.scale(temp, dx, mt*this.q.inverse_mass)); 
}