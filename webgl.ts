export type Vec3 = { array?: Float32Array | number[] } & { [xyz: string]: number }
export const Vector3 = {
  create(x: number, y: number, z: number) : Vec3 {
    return { "x": x, "y": y, "z": z }
  },
  dot: (v0: Vec3, v1: Vec3) => v0.x * v1.x + v0.y * v1.y + v0.z * v1.z,
  cross(v: Vec3, v0: Vec3, v1: Vec3) {
    v.x = v0.y * v1.z - v0.z * v1.y
    v.y = v0.z * v1.x - v0.x * v1.z
    v.z = v0.x * v1.y - v0.y * v1.x
  },
  normalize(v: Vec3) {
    let l = v.x * v.x + v.y * v.y + v.z * v.z
    if (l <= 0.00001) return
    l = 1 / Math.sqrt(l)
    v.x *= l
    v.y *= l
    v.z *= l
  },
  arrayForm(v: Vec3) {
    if (v.array) v.array = [v.x, v.y, v.z]
    else v.array = new Float32Array([v.x, v.y, v.z])
    return v.array
  },
}

export const Matrix44 = {
  createIdentity: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
  loadProjection(m: Float32Array, aspect: number, vdeg: number, near: number, far: number) {
    const h = near * Math.tan(vdeg * Math.PI / 180 * 0.5) * 2
    const w = h * aspect

    m[0] = 2 * near / w
    m[1] = 0
    m[2] = 0
    m[3] = 0

    m[4] = 0
    m[5] = 2 * near / h
    m[6] = 0
    m[7] = 0

    m[8] = 0
    m[9] = 0
    m[10] = -(far + near) / (far - near)
    m[11] = -1

    m[12] = 0
    m[13] = 0
    m[14] = -2 * far * near / (far - near)
    m[15] = 0
  },
  loadLookAt(m: Float32Array, vpos: Vec3, vlook: Vec3, vup: Vec3) {
    const frontv = Vector3.create(vpos.x - vlook.x, vpos.y - vlook.y, vpos.z - vlook.z)
    Vector3.normalize(frontv)
    const sidev = Vector3.create(1, 0, 0)
    Vector3.cross(sidev, vup, frontv)
    Vector3.normalize(sidev)
    const topv = Vector3.create(1, 0, 0)
    Vector3.cross(topv, frontv, sidev)
    Vector3.normalize(topv)

    m[0] = sidev.x
    m[1] = topv.x
    m[2] = frontv.x
    m[3] = 0

    m[4] = sidev.y
    m[5] = topv.y
    m[6] = frontv.y
    m[7] = 0

    m[8] = sidev.z
    m[9] = topv.z
    m[10] = frontv.z
    m[11] = 0

    m[12] = -(vpos.x * m[0] + vpos.y * m[4] + vpos.z * m[8])
    m[13] = -(vpos.x * m[1] + vpos.y * m[5] + vpos.z * m[9])
    m[14] = -(vpos.x * m[2] + vpos.y * m[6] + vpos.z * m[10])
    m[15] = 1
  },
}