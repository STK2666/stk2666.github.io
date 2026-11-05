---
layout: null
sitemap: false
---
<meta name="robots" content="noindex,nofollow"/>

# UFUG2102 First Tutorial
## Meet Matrices: Representations and Applications

Course: Matrix Algebra and Applications. Duration: 50 minutes.
Audience: undergraduate students beginning the course; no robotics background required.

## Intended learning outcomes
1. Given matrices and simple contexts, identify dimensions, specified entries and common matrix types, correctly completing at least 4 of 5 items.
2. Using supplied examples and an interactive demo, explain matrices as representations of data, relationships and spatial transformations, correctly completing at least 2 of 3 application tasks.

## Lesson schedule
| Time | Topic and purpose | Learner activity | 5E alignment |
| --- | --- | --- | --- |
| 00–05 | Where do we find matrices? Images, networks and robots | Think, discuss in pairs and vote | Engage |
| 05–08 | A brief history: linear systems, Sylvester (1850), Cayley (1858) | Answer one background question | Explain |
| 08–18 | Definition, rows, columns, dimensions, entries and common types | Think–Pair–Share classification | Explore / Explain |
| 18–23 | Course map: linear systems, transformations, eigenvectors, inner product spaces | Connect a question to a mathematical topic | Explain / Elaborate |
| 23–30 | Matrices represent data, relationships and transforms | Match application scenarios | Explore / Elaborate |
| 30–40 | Interactive demo: rigid pose, joint chains and kinematics | Predict–Observe–Explain with paired operation | Explore / Evaluate |
| 40–47 | Consolidation and feedback | Solve in groups, exchange answers and explain | Explain / Evaluate |
| 47–50 | Individual exit ticket and conclusion | Complete five structure items and three application items | Evaluate |

## Definitions and examples
A real m-by-n matrix is a rectangular array of real entries, with m rows and n columns. Entry a_ij is in row i and column j.
- Zero matrix: every entry is zero; it need not be square.
- Identity matrix: square, with ones on the main diagonal and zeros elsewhere.
- Diagonal matrix: square, with zero off-diagonal entries.
- Symmetric matrix: A = A^T. An undirected adjacency matrix is an example.
These types overlap: an identity matrix is both diagonal and symmetric.

A = [[2,0,5],[1,3,4]] has dimensions 2 by 3 and a_23 = 4.
G = [[0,255],[128,64]] can represent an 8-bit grayscale image.
N = [[0,1,0],[1,0,1],[0,1,0]] represents an undirected network without self-connections.
D = diag(2,1) maps (1,1) to (2,1).

## Demo concepts
The rigid pose T = [[R,t],[0,1]] describes orientation and position. R has orthonormal columns and determinant +1. Its columns express the object's local axes in world coordinates. Translation requires homogeneous coordinates; it is not a linear map on ordinary 3D coordinates.

The interface uses column vectors, metres, degrees and R = Rz Ry Rx. The rightmost factor acts first. The optional homogeneous-weight control edits only the bottom-right entry w. The matrix maps [p,1] to [Rp+t,w]; Cartesian coordinates are (Rp+t)/w. Both object size and position are divided by w. Standard rigid poses use w=1. Zero and near-zero weights are rejected. Scaling the entire matrix by a common nonzero constant leaves Cartesian results unchanged.

Forward kinematics composes the world-to-base pose, fixed link transforms and joint rotations to obtain the end-effector pose. Inverse kinematics searches for joint angles that realize a desired end-effector pose. Numerical nonconvergence does not prove unreachability. The humanoid playground is an optional extension.

## Activities and answers
### Structure classification
- [[1,0],[0,1]]: identity, diagonal, symmetric.
- [[2,0],[0,3]]: diagonal, symmetric.
- [[0,1],[1,0]]: symmetric, not diagonal.
- [[0,0,0],[0,0,0]]: zero, not square.

### Applications
1. What does G_12 = 255 mean? The pixel in row 1, column 2 has maximum brightness in this 8-bit example.
2. Why is N symmetric? An undirected connection from i to j also connects j to i.
3. Does changing only joint 7 move the origin of link 4? No: joint 7 is outside that point's ancestor chain.

### Individual exit ticket
Structure items, one point each:
1. Dimensions of [[1,2,3],[4,5,6]]? 2 by 3.
2. Its a_21? 4.
3. Is [[0,0,0],[0,0,0]] a zero matrix? Yes.
4. Is [[1,0],[0,1]] an identity matrix? Yes.
5. Is [[2,1],[1,3]] symmetric? Yes.

Application items, one point each for a correct answer and explanation:
1. Grayscale entries represent brightness, with one entry per pixel.
2. Undirected adjacency is symmetric because the connection is mutual.
3. Changing only the translation column changes position, not orientation, because R is unchanged.

ILO thresholds: at least 4/5 structure items and 2/3 application items.

## Preparation
Use one device per pair. Preload the local model and test the projector and WebGL. Keep a local HTTP-served build available. Without student devices, invite predictions and let students direct the demonstrator verbally.

The course map is thematic; the instructor's syllabus determines the actual sequence. The lesson applies ABCD outcomes, constructive alignment, active learning, the 5E activity framework and a beginning–practice–feedback–conclusion structure.
