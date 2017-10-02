/**
 * @license
 * Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import * as environment from './environment';
import {ENV, Environment, Features} from './environment';
import {NDArrayMath} from './math/math';
import {NDArrayMathCPU} from './math/math_cpu';
import {NDArrayMathGPU} from './math/math_gpu';

/** Accuracy for tests. */
export const TEST_EPSILON =
    ENV.get('WEBGL_FLOAT_TEXTURE_ENABLED') ? 1e-4 : 1e-2;

export const TEST_LOW_PRECISION =
    ENV.get('WEBGL_FLOAT_TEXTURE_ENABLED') ? 3 : 1;

export const TEST_LOW_PRECISION_EPSILON = 1 / Math.pow(10, TEST_LOW_PRECISION);

export function expectArraysClose(
    actual: Float32Array, expected: Float32Array, epsilon = TEST_EPSILON) {
  if (actual.length !== expected.length) {
    throw new Error(
        'Matrices have different lengths (' + actual.length + ' vs ' +
        expected.length + ').');
  }
  for (let i = 0; i < expected.length; ++i) {
    const a = actual[i];
    const e = expected[i];
    if (isNaN(a) && isNaN(e)) {
      continue;
    }
    if (isNaN(a) || isNaN(e) || Math.abs(a - e) > epsilon) {
      const actualStr = 'actual[' + i + '] === ' + a;
      const expectedStr = 'expected[' + i + '] === ' + e;
      throw new Error('Arrays differ: ' + actualStr + ', ' + expectedStr);
    }
  }
}

export function randomArrayInRange(
    n: number, minValue: number, maxValue: number): Float32Array {
  const v = new Float32Array(n);
  const range = maxValue - minValue;
  for (let i = 0; i < n; ++i) {
    v[i] = (Math.random() * range) + minValue;
  }
  return v;
}

export function makeIdentity(n: number): Float32Array {
  const i = new Float32Array(n * n);
  for (let j = 0; j < n; ++j) {
    i[(j * n) + j] = 1;
  }
  return i;
}

export function setValue(
    m: Float32Array, mNumRows: number, mNumCols: number, v: number, row: number,
    column: number) {
  if (row >= mNumRows) {
    throw new Error('row (' + row + ') must be in [0 ' + mNumRows + '].');
  }
  if (column >= mNumCols) {
    throw new Error('column (' + column + ') must be in [0 ' + mNumCols + '].');
  }
  m[(row * mNumCols) + column] = v;
}

export function cpuMultiplyMatrix(
    a: Float32Array, aRow: number, aCol: number, b: Float32Array, bRow: number,
    bCol: number) {
  const result = new Float32Array(aRow * bCol);
  for (let r = 0; r < aRow; ++r) {
    const aOffset = (r * aCol);
    const cOffset = (r * bCol);
    for (let c = 0; c < bCol; ++c) {
      let d = 0;
      for (let k = 0; k < aCol; ++k) {
        d += a[aOffset + k] * b[(k * bCol) + c];
      }
      result[cOffset + c] = d;
    }
  }
  return result;
}

export function cpuDotProduct(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error('cpuDotProduct: incompatible vectors.');
  }
  let d = 0;
  for (let i = 0; i < a.length; ++i) {
    d += a[i] * b[i];
  }
  return d;
}

export type MathTests =
    (it: (name: string, testFn: (math: NDArrayMath) => void) => void) => void;

export function describeMathCPU(
    name: string, tests: MathTests[], featuresList?: Features[]) {
  const testNameBase = 'math_cpu.' + name;
  describeMathCommon(
      testNameBase, tests, () => new NDArrayMathCPU(), featuresList);
}

export function describeMathGPU(
    name: string, tests: MathTests[], featuresList?: Features[]) {
  const testNameBase = 'math_gpu.' + name;
  describeMathCommon(
      testNameBase, tests, () => new NDArrayMathGPU(), featuresList);
}

function describeMathCommon(
    testNameBase: string, tests: MathTests[], mathFactory: () => NDArrayMath,
    featuresList?: Features[]) {
  if (featuresList != null) {
    featuresList.forEach(features => {
      const testName = testNameBase + ' ' + JSON.stringify(features);
      executeMathTests(testName, tests, mathFactory);
    });
  } else {
    executeMathTests(testNameBase, tests, mathFactory);
  }
}

export function executeMathTests(
    testName: string, tests: MathTests[], mathFactory: () => NDArrayMath,
    features?: Features) {
  describe(testName, () => {
    let math: NDArrayMath;
    const itWrapper = (name: string, testFunc: (math: NDArrayMath) => void) => {
      it(name, () => testFunc(math));
    };

    beforeEach(() => {
      math = mathFactory();
      math.startScope();

      if (features != null) {
        environment.setEnvironment(new Environment(features));
      }
    });

    afterEach(() => {
      math.endScope(null);
      math.dispose();

      if (features != null) {
        environment.setEnvironment(new Environment());
      }
    });

    tests.forEach(test => test(itWrapper));
  });
}
