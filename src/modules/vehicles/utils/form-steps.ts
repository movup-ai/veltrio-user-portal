/**
 * The furthest step that can be jumped to when the form opens. A vehicle being edited already
 * passed every step, so all of them are open; a new one unlocks each as Next validates it.
 */
export function initialFurthestStep(isEdit: boolean, stepCount: number): number {
  return isEdit ? stepCount - 1 : 0
}
