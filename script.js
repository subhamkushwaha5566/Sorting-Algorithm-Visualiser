/* ALDO SORT - script.js
   Implements: UI controls, sorting algorithms (stats tracked), charts (Chart.js), code snippets, stop/start
*/

(() => {
  // DOM elements
  const algoSelect = document.getElementById("algoSelect");
  const sizeRange = document.getElementById("sizeRange");
  const sizeLabel = document.getElementById("sizeLabel");
  const speedRange = document.getElementById("speedRange");
  const speedLabel = document.getElementById("speedLabel");
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const regenBtn = document.getElementById("regenBtn");

  const barsEl = document.getElementById("bars");
  const comparisonsEl = document.getElementById("comparisons");
  const swapsEl = document.getElementById("swaps");
  const accessesEl = document.getElementById("accesses");
  const timeTakenEl = document.getElementById("timeTaken");

  const timeComplexEl = document.getElementById("timeComplexity");
  const spaceComplexEl = document.getElementById("spaceComplexity");
  const stableEl = document.getElementById("stable");
  const algoInfoEl = document.getElementById("algoInfo");

  const codeBox = document.getElementById("codeBox");
  const codeLang = document.getElementById("codeLang");
  const copyBtn = document.getElementById("copyBtn");

  // state
  let arr = [];
  let comparisons = 0;
  let swaps = 0;
  let accesses = 0;
  let running = false;
  let stopRequested = false;
  let startTime = 0;

  // charts
  let complexityChart, performanceChart;

  // helper: sleep according to speed slider
  function getDelay() {
    const v = Number(speedRange.value); // 1..100
    // invert slider so higher value -> faster
    const ms = Math.round(700 - (v / 100) * 680); // ~20..700
    return ms;
  }

  // UI update functions
  function updateStatsPanel() {
    comparisonsEl.textContent = comparisons;
    swapsEl.textContent = swaps;
    accessesEl.textContent = accesses;
  }

  function updateTimeTaken(ms) {
    timeTakenEl.textContent = `${ms.toFixed(2)} ms`;
  }

  function resetStats() {
    comparisons = swaps = accesses = 0;
    updateStatsPanel();
    updateTimeTaken(0);
    // reset perf chart (but we only update full chart at end)
    if (performanceChart) {
      performanceChart.data.datasets[0].data = [0, 0, 0];
      performanceChart.update();
    }
  }

  // create random array
  function generateArray() {
    const size = Number(sizeRange.value);
    arr = [];
    for (let i = 0; i < size; i++) {
      // range 10..400 scaled
      arr.push(Math.floor(Math.random() * 380) + 10);
    }
    resetStats();
    renderArray();
    updateComplexityInfo();
    updateCodeSnippet();
  }

  // render bars
  function renderArray(highlights = {}) {
    // highlights: { compare: [i,j], swap: [i,j], sorted: index, colourMap: {i:"#hex"} }
    barsEl.innerHTML = "";
    const n = arr.length;
    for (let i = 0; i < n; i++) {
      const b = document.createElement("div");
      b.className = "bar";
      // width calculation
      const pct = Math.max(2, Math.floor((100 / n) - 0.6));
      b.style.width = pct + "%";
      b.style.height = `${arr[i]}px`;
      b.style.background = "linear-gradient(180deg,#2dd4bf88,#10b981)";
      b.style.color = "#072025";
      b.style.border = "1px solid rgba(0,0,0,0.25)";
      b.textContent = arr[i];

      if (highlights.swap && highlights.swap.includes(i)) {
        b.style.background = "#ef4444";
        b.style.color = "#fff";
      } else if (highlights.compare && highlights.compare.includes(i)) {
        b.style.background = "#f59e0b";
        b.style.color = "#fff";
      } else if (typeof highlights.sorted === "number" && i >= highlights.sorted) {
        b.style.background = "#06b6d4";
        b.style.color = "#072025";
      }

      if (highlights.colourMap && highlights.colourMap[i]) {
        b.style.background = highlights.colourMap[i];
      }

      barsEl.appendChild(b);
    }
  }

  // Chart.js: complexity chart & performance chart
  function initCharts() {
    const ctx1 = document.getElementById("complexityChart").getContext("2d");
    const ctx2 = document.getElementById("performanceChart").getContext("2d");

    // complexity chart: theoretical curves for n, nlogn, n^2 (plotted for sizes)
    const labels = Array.from({ length: 91 }, (_, i) => 10 + i); // 10..100
    const nValues = labels.map(x => x);
    const nlogn = labels.map(x => Math.round(x * Math.log2(Math.max(2, x))));
    const n2 = labels.map(x => x * x);
    const qnlogn = nlogn.map(v => Math.round(v * 0.9));
    const heap = nlogn.map(v => Math.round(v * 1.05));

    complexityChart = new Chart(ctx1, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "O(n²) - Bubble", data: n2, borderColor: "#ef4444", borderWidth: 2, pointRadius: 0, tension: 0.25, fill: false },
          { label: "O(n log n) - Merge", data: nlogn, borderColor: "#06b6d4", borderWidth: 2, pointRadius: 0, tension: 0.25, fill: false },
          { label: "O(n log n) - Quick", data: qnlogn, borderColor: "#3b82f6", borderWidth: 2, pointRadius: 0, tension: 0.25, fill: false },
          { label: "O(n log n) - Heap", data: heap, borderColor: "#8b5cf6", borderWidth: 2, pointRadius: 0, tension: 0.25, fill: false }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false, // important: do not animate on creation
        plugins: { legend: { labels: { color: "#0f172a" } } },
        scales: {
          x: { ticks: { color: "#6b7280" } },
          y: { beginAtZero: true, ticks: { color: "#6b7280" } }
        }
      }
    });

    performanceChart = new Chart(ctx2, {
      type: "bar",
      data: {
        labels: ["Comparisons", "Swaps", "Time (ms)"],
        datasets: [{
          label: "Current",
          data: [0, 0, 0],
          backgroundColor: ["#16a34a", "#ef4444", "#f59e0b"]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false, // we update at end, no animations
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#0f172a" } },
          y: { beginAtZero: true, ticks: { color: "#0f172a" } }
        }
      }
    });
  }

  // update performance chart once at end
  function updatePerformanceChartAtEnd() {
    if (!performanceChart) return;
    // parse timeTakenEl content to float; remove " ms"
    let timeVal = 0;
    try {
      timeVal = parseFloat(timeTakenEl.textContent) || 0;
    } catch (e) {
      timeVal = 0;
    }
    performanceChart.data.datasets[0].data = [comparisons, swaps, timeVal];
    performanceChart.update();
  }

  // helpers counting stats (exposed to sorts)
  function statCompare() { comparisons++; updateStatsPanel(); }
  function statSwap(i, j) { swaps++; accesses += 2; updateStatsPanel(); }
  function statAccess(n = 1) { accesses += n; updateStatsPanel(); }

  // Sleep helper
  function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  // STOP check
  function shouldStop() { return stopRequested; }

  // Sorting implementations with stats and highlights
  async function bubbleSort() {
    const n = arr.length;
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        statCompare();
        renderArray({ compare: [j, j + 1] });
        await sleep(getDelay());
        if (shouldStop()) return;
        if (arr[j] > arr[j + 1]) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
          statSwap(j, j + 1);
          renderArray({ swap: [j, j + 1] });
          await sleep(getDelay());
          if (shouldStop()) return;
        }
      }
      renderArray({ sorted: n - i - 1 });
    }
    renderArray({ sorted: n - 1 });
  }

  async function selectionSort() {
    const n = arr.length;
    for (let i = 0; i < n - 1; i++) {
      let minIdx = i;
      for (let j = i + 1; j < n; j++) {
        statCompare();
        renderArray({ compare: [minIdx, j] });
        await sleep(getDelay());
        if (shouldStop()) return;
        if (arr[j] < arr[minIdx]) minIdx = j;
      }
      if (minIdx !== i) {
        [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
        statSwap(i, minIdx);
        renderArray({ swap: [i, minIdx], sorted: i });
        await sleep(getDelay());
        if (shouldStop()) return;
      } else {
        renderArray({ sorted: i });
      }
    }
    renderArray({ sorted: n - 1 });
  }

  async function insertionSort() {
    const n = arr.length;
    for (let i = 1; i < n; i++) {
      let key = arr[i];
      statAccess(1);
      let j = i - 1;
      while (j >= 0) {
        statCompare();
        renderArray({ compare: [j, j + 1] });
        await sleep(getDelay());
        if (shouldStop()) return;
        if (arr[j] > key) {
          arr[j + 1] = arr[j];
          statAccess(1);
          // count as a "movement" to swaps metric for visualization purposes
          swaps++;
          accesses += 1;
          updateStatsPanel();
          j--;
        } else break;
      }
      arr[j + 1] = key;
      statAccess(1);
      renderArray({ sorted: i });
      await sleep(getDelay());
      if (shouldStop()) return;
    }
    renderArray({ sorted: n - 1 });
  }

  // Merge sort helpers
  async function mergeSortWrapper() {
    await mergeSort(0, arr.length - 1);
    renderArray({ sorted: arr.length - 1 });
  }

  async function mergeSort(l, r) {
    if (l >= r) return;
    const m = Math.floor((l + r) / 2);
    await mergeSort(l, m);
    if (shouldStop()) return;
    await mergeSort(m + 1, r);
    if (shouldStop()) return;
    await merge(l, m, r);
  }

  async function merge(l, m, r) {
    const left = arr.slice(l, m + 1);
    const right = arr.slice(m + 1, r + 1);
    statAccess(left.length + right.length);
    let i = 0, j = 0, k = l;
    while (i < left.length && j < right.length) {
      statCompare();
      renderArray({ compare: [k] });
      await sleep(getDelay());
      if (shouldStop()) return;
      if (left[i] <= right[j]) {
        arr[k] = left[i++];
        statAccess(1);
      } else {
        arr[k] = right[j++];
        statAccess(1);
        // count as movement
        swaps++;
      }
      k++;
      renderArray({ compare: [k - 1] });
      await sleep(getDelay());
    }
    while (i < left.length) {
      arr[k++] = left[i++];
      statAccess(1);
      renderArray({ compare: [k - 1] });
      await sleep(getDelay());
      if (shouldStop()) return;
    }
    while (j < right.length) {
      arr[k++] = right[j++];
      statAccess(1);
      renderArray({ compare: [k - 1] });
      await sleep(getDelay());
      if (shouldStop()) return;
    }
  }

  // QuickSort
  async function quickSortWrapper() {
    await quickSort(0, arr.length - 1);
    renderArray({ sorted: arr.length - 1 });
  }

  async function quickSort(l, r) {
    if (l >= r) return;
    const p = await partition(l, r);
    if (shouldStop()) return;
    await quickSort(l, p - 1);
    if (shouldStop()) return;
    await quickSort(p + 1, r);
  }

  async function partition(l, r) {
    const pivot = arr[r];
    statAccess(1);
    let i = l - 1;
    for (let j = l; j < r; j++) {
      statCompare();
      renderArray({ compare: [j, r] });
      await sleep(getDelay());
      if (shouldStop()) return r;
      if (arr[j] < pivot) {
        i++;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        statSwap(i, j);
        renderArray({ swap: [i, j] });
        await sleep(getDelay());
        if (shouldStop()) return r;
      }
    }
    [arr[i + 1], arr[r]] = [arr[r], arr[i + 1]];
    statSwap(i + 1, r);
    renderArray({ swap: [i + 1, r] });
    await sleep(getDelay());
    return i + 1;
  }

  // Heap sort
  async function heapSort() {
    const n = arr.length;
    // build heap
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      await heapify(n, i);
      if (shouldStop()) return;
    }
    for (let i = n - 1; i > 0; i--) {
      [arr[0], arr[i]] = [arr[i], arr[0]];
      statSwap(0, i);
      renderArray({ swap: [0, i], sorted: i });
      await sleep(getDelay());
      if (shouldStop()) return;
      await heapify(i, 0);
      if (shouldStop()) return;
    }
    renderArray({ sorted: n - 1 });
  }

  async function heapify(n, i) {
    let largest = i;
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    if (l < n) { statCompare(); if (arr[l] > arr[largest]) largest = l; }
    if (r < n) { statCompare(); if (arr[r] > arr[largest]) largest = r; }
    if (largest !== i) {
      [arr[i], arr[largest]] = [arr[largest], arr[i]];
      statSwap(i, largest);
      renderArray({ swap: [i, largest] });
      await sleep(getDelay());
      if (shouldStop()) return;
      await heapify(n, largest);
    }
  }

  // mapping complexity + info
  const algoMeta = {
    bubble: { time: "O(n²)", space: "O(1)", stable: "Yes", info: "Repeatedly steps through the list, compares adjacent elements and swaps if out of order." },
    selection: { time: "O(n²)", space: "O(1)", stable: "No", info: "Selects the minimum/maximum and swaps to correct position." },
    insertion: { time: "O(n²)", space: "O(1)", stable: "Yes", info: "Builds sorted list by inserting elements into correct place." },
    merge: { time: "O(n log n)", space: "O(n)", stable: "Yes", info: "Divides array and merges sorted halves." },
    quick: { time: "O(n log n)", space: "O(log n)", stable: "No", info: "Divide & conquer using partitioning around a pivot." },
    heap: { time: "O(n log n)", space: "O(1)", stable: "No", info: "Uses heap data structure to repeatedly extract max/min." }
  };

  function updateComplexityInfo() {
    const key = algoSelect.value;
    const meta = algoMeta[key] || algoMeta.bubble;
    timeComplexEl.textContent = meta.time;
    spaceComplexEl.textContent = meta.space;
    stableEl.textContent = meta.stable;
    algoInfoEl.textContent = meta.info;
  }

  // code snippet text (JS + Python + Java + C++ + C)
  const codeSnippets = {
  // 🔹 Bubble Sort
  bubble_js:
`function bubbleSort(arr) {
  for (let i = 0; i < arr.length - 1; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
      if (arr[j] > arr[j+1]) {
        [arr[j], arr[j+1]] = [arr[j+1], arr[j]];
      }
    }
  }
  return arr;
}`,
  bubble_py:
`def bubble_sort(arr):
    n = len(arr)
    for i in range(n-1):
        for j in range(n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr`,
  bubble_java:
`public class BubbleSort {
    static void bubbleSort(int arr[]) {
        int n = arr.length;
        for (int i = 0; i < n-1; i++) {
            for (int j = 0; j < n-i-1; j++) {
                if (arr[j] > arr[j+1]) {
                    int temp = arr[j];
                    arr[j] = arr[j+1];
                    arr[j+1] = temp;
                }
            }
        }
    }
}`,
  bubble_cpp:
`void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n-1; i++) {
        for (int j = 0; j < n-i-1; j++) {
            if (arr[j] > arr[j+1]) {
                std::swap(arr[j], arr[j+1]);
            }
        }
    }
}`,
  bubble_c:
`void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n-1; i++) {
        for (int j = 0; j < n-i-1; j++) {
            if (arr[j] > arr[j+1]) {
                int temp = arr[j];
                arr[j] = arr[j+1];
                arr[j+1] = temp;
            }
        }
    }
}`,

  // 🔹 Selection Sort
  selection_js:
`function selectionSort(arr) {
  for (let i = 0; i < arr.length; i++) {
    let minIdx = i;
    for (let j = i+1; j < arr.length; j++) {
      if (arr[j] < arr[minIdx]) minIdx = j;
    }
    [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
  }
  return arr;
}`,
  selection_py:
`def selection_sort(arr):
    n = len(arr)
    for i in range(n):
        min_idx = i
        for j in range(i+1, n):
            if arr[j] < arr[min_idx]:
                min_idx = j
        arr[i], arr[min_idx] = arr[min_idx], arr[i]
    return arr`,
  selection_java:
`public class SelectionSort {
    static void selectionSort(int arr[]) {
        int n = arr.length;
        for (int i = 0; i < n-1; i++) {
            int minIdx = i;
            for (int j = i+1; j < n; j++) {
                if (arr[j] < arr[minIdx]) minIdx = j;
            }
            int temp = arr[minIdx];
            arr[minIdx] = arr[i];
            arr[i] = temp;
        }
    }
}`,
  selection_cpp:
`void selectionSort(int arr[], int n) {
    for (int i = 0; i < n-1; i++) {
        int minIdx = i;
        for (int j = i+1; j < n; j++) {
            if (arr[j] < arr[minIdx]) minIdx = j;
        }
        std::swap(arr[minIdx], arr[i]);
    }
}`,
  selection_c:
`void selectionSort(int arr[], int n) {
    for (int i = 0; i < n-1; i++) {
        int minIdx = i;
        for (int j = i+1; j < n; j++) {
            if (arr[j] < arr[minIdx]) minIdx = j;
        }
        int temp = arr[minIdx];
        arr[minIdx] = arr[i];
        arr[i] = temp;
    }
}`,

  // 🔹 Insertion Sort
  insertion_js:
`function insertionSort(arr) {
  for (let i = 1; i < arr.length; i++) {
    let key = arr[i];
    let j = i - 1;
    while (j >= 0 && arr[j] > key) {
      arr[j+1] = arr[j];
      j--;
    }
    arr[j+1] = key;
  }
  return arr;
}`,
  insertion_py:
`def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i-1
        while j >=0 and arr[j] > key:
            arr[j+1] = arr[j]
            j -= 1
        arr[j+1] = key
    return arr`,
  insertion_java:
`public class InsertionSort {
    static void insertionSort(int arr[]) {
        for (int i = 1; i < arr.length; i++) {
            int key = arr[i];
            int j = i - 1;
            while (j >= 0 && arr[j] > key) {
                arr[j+1] = arr[j];
                j--;
            }
            arr[j+1] = key;
        }
    }
}`,
  insertion_cpp:
`void insertionSort(int arr[], int n) {
    for (int i = 1; i < n; i++) {
        int key = arr[i];
        int j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j+1] = arr[j];
            j--;
        }
        arr[j+1] = key;
    }
}`,
  insertion_c:
`void insertionSort(int arr[], int n) {
    for (int i = 1; i < n; i++) {
        int key = arr[i];
        int j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j+1] = arr[j];
            j--;
        }
        arr[j+1] = key;
    }
}`,

  // 🔹 Merge Sort
  merge_js:
`function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length/2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  const merged = [];
  while (left.length && right.length) {
    merged.push(left[0] <= right[0] ? left.shift() : right.shift());
  }
  return merged.concat(left, right);
}`,
  merge_py:
`def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr)//2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    merged = []
    while left and right:
        if left[0] <= right[0]:
            merged.append(left.pop(0))
        else:
            merged.append(right.pop(0))
    merged.extend(left or right)
    return merged`,
  merge_java:
`public class MergeSort {
    static void merge(int arr[], int l, int m, int r) {
        int n1 = m - l + 1, n2 = r - m;
        int L[] = new int[n1], R[] = new int[n2];
        for (int i=0;i<n1;i++) L[i]=arr[l+i];
        for (int j=0;j<n2;j++) R[j]=arr[m+1+j];
        int i=0,j=0,k=l;
        while(i<n1&&j<n2) arr[k++] = (L[i]<=R[j]) ? L[i++] : R[j++];
        while(i<n1) arr[k++] = L[i++];
        while(j<n2) arr[k++] = R[j++];
    }
    static void mergeSort(int arr[], int l, int r) {
        if (l<r) {
            int m=(l+r)/2;
            mergeSort(arr,l,m);
            mergeSort(arr,m+1,r);
            merge(arr,l,m,r);
        }
    }
}`,
  merge_cpp:
`void merge(int arr[], int l, int m, int r) {
    int n1 = m-l+1, n2 = r-m;
    int L[n1], R[n2];
    for(int i=0;i<n1;i++) L[i]=arr[l+i];
    for(int j=0;j<n2;j++) R[j]=arr[m+1+j];
    int i=0,j=0,k=l;
    while(i<n1&&j<n2) arr[k++] = (L[i]<=R[j])?L[i++]:R[j++];
    while(i<n1) arr[k++]=L[i++];
    while(j<n2) arr[k++]=R[j++];
}
void mergeSort(int arr[], int l, int r) {
    if(l<r) {
        int m=(l+r)/2;
        mergeSort(arr,l,m);
        mergeSort(arr,m+1,r);
        merge(arr,l,m,r);
    }
}`,
  merge_c:
`void merge(int arr[], int l, int m, int r) {
    int n1=m-l+1,n2=r-m;
    int L[n1],R[n2];
    for(int i=0;i<n1;i++) L[i]=arr[l+i];
    for(int j=0;j<n2;j++) R[j]=arr[m+1+j];
    int i=0,j=0,k=l;
    while(i<n1&&j<n2) arr[k++]=(L[i]<=R[j])?L[i++]:R[j++];
    while(i<n1) arr[k++]=L[i++];
    while(j<n2) arr[k++]=R[j++];
}
void mergeSort(int arr[], int l, int r) {
    if(l<r) {
        int m=(l+r)/2;
        mergeSort(arr,l,m);
        mergeSort(arr,m+1,r);
        merge(arr,l,m,r);
    }
}`,

  // 🔹 Quick Sort
  quick_js:
`function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[arr.length - 1];
  const left = [], right = [];
  for (let i = 0; i < arr.length - 1; i++) {
    (arr[i] < pivot ? left : right).push(arr[i]);
  }
  return [...quickSort(left), pivot, ...quickSort(right)];
}`,
  quick_py:
`def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[-1]
    left = [x for x in arr[:-1] if x < pivot]
    right = [x for x in arr[:-1] if x >= pivot]
    return quick_sort(left) + [pivot] + quick_sort(right)`,
  quick_java:
`public class QuickSort {
    static int partition(int arr[], int low, int high) {
        int pivot = arr[high];
        int i = low - 1;
        for (int j = low; j < high; j++) {
            if (arr[j] < pivot) {
                i++;
                int temp = arr[i]; arr[i]=arr[j]; arr[j]=temp;
            }
        }
        int temp = arr[i+1]; arr[i+1]=arr[high]; arr[high]=temp;
        return i+1;
    }
    static void quickSort(int arr[], int low, int high) {
        if (low < high) {
            int pi = partition(arr, low, high);
            quickSort(arr, low, pi-1);
            quickSort(arr, pi+1, high);
        }
    }
}`,
  quick_cpp:
`int partition(int arr[], int low, int high) {
    int pivot = arr[high];
    int i=low-1;
    for(int j=low;j<high;j++) {
        if(arr[j]<pivot) {
            i++;
            std::swap(arr[i],arr[j]);
        }
    }
    std::swap(arr[i+1],arr[high]);
    return i+1;
}
void quickSort(int arr[], int low, int high) {
    if(low<high) {
        int pi=partition(arr,low,high);
        quickSort(arr,low,pi-1);
        quickSort(arr,pi+1,high);
    }
}`,
  quick_c:
`int partition(int arr[], int low, int high) {
    int pivot=arr[high];
    int i=low-1;
    for(int j=low;j<high;j++) {
        if(arr[j]<pivot) {
            i++;
            int t=arr[i]; arr[i]=arr[j]; arr[j]=t;
        }
    }
    int t=arr[i+1]; arr[i+1]=arr[high]; arr[high]=t;
    return i+1;
}
void quickSort(int arr[], int low, int high) {
    if(low<high) {
        int pi=partition(arr,low,high);
        quickSort(arr,low,pi-1);
        quickSort(arr,pi+1,high);
    }
}`,

  // 🔹 Heap Sort
  heap_js:
`function heapSort(arr) {
  function heapify(n, i) {
    let largest = i, l = 2*i + 1, r = 2*i + 2;
    if (l < n && arr[l] > arr[largest]) largest = l;
    if (r < n && arr[r] > arr[largest]) largest = r;
    if (largest !== i) {
      [arr[i], arr[largest]] = [arr[largest], arr[i]];
      heapify(n, largest);
    }
  }
  for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i--) heapify(arr.length, i);
  for (let i = arr.length - 1; i > 0; i--) {
    [arr[0], arr[i]] = [arr[i], arr[0]];
    heapify(i, 0);
  }
  return arr;
}`,
  heap_py:
`def heap_sort(arr):
    import heapq
    heapq.heapify(arr)
    return [heapq.heappop(arr) for _ in range(len(arr))]`,
  heap_java:
`public class HeapSort {
    static void heapify(int arr[], int n, int i) {
        int largest=i, l=2*i+1, r=2*i+2;
        if(l<n && arr[l]>arr[largest]) largest=l;
        if(r<n && arr[r]>arr[largest]) largest=r;
        if(largest!=i) {
            int temp=arr[i]; arr[i]=arr[largest]; arr[largest]=temp;
            heapify(arr,n,largest);
        }
    }
    static void heapSort(int arr[]) {
        int n=arr.length;
        for(int i=n/2-1;i>=0;i--) heapify(arr,n,i);
        for(int i=n-1;i>0;i--) {
            int temp=arr[0]; arr[0]=arr[i]; arr[i]=temp;
            heapify(arr,i,0);
        }
    }
}`,
  heap_cpp:
`void heapify(int arr[], int n, int i) {
    int largest=i,l=2*i+1,r=2*i+2;
    if(l<n && arr[l]>arr[largest]) largest=l;
    if(r<n && arr[r]>arr[largest]) largest=r;
    if(largest!=i) {
        std::swap(arr[i],arr[largest]);
        heapify(arr,n,largest);
    }
}
void heapSort(int arr[], int n) {
    for(int i=n/2-1;i>=0;i--) heapify(arr,n,i);
    for(int i=n-1;i>0;i--) {
        std::swap(arr[0],arr[i]);
        heapify(arr,i,0);
    }
}`,
  heap_c:
`void heapify(int arr[], int n, int i) {
    int largest=i,l=2*i+1,r=2*i+2;
    if(l<n && arr[l]>arr[largest]) largest=l;
    if(r<n && arr[r]>arr[largest]) largest=r;
    if(largest!=i) {
        int t=arr[i]; arr[i]=arr[largest]; arr[largest]=t;
        heapify(arr,n,largest);
    }
}
void heapSort(int arr[], int n) {
    for(int i=n/2-1;i>=0;i--) heapify(arr,n,i);
    for(int i=n-1;i>0;i--) {
        int t=arr[0]; arr[0]=arr[i]; arr[i]=t;
        heapify(arr,i,0);
    }
}`
  };

  // Determine language key correctly and update snippet
  function updateCodeSnippet() {
    const algo = algoSelect.value;
    const langRaw = (codeLang.value || "").toLowerCase();
    // check c++ first, then other specific languages, then fallback to js
    let langKey = "js";
    if (langRaw.includes("python")) langKey = "py";
    else if (langRaw.includes("c++") || langRaw.includes("cpp")) langKey = "cpp";
    else if (langRaw.includes("java")) langKey = "java";
    else if (langRaw === "c" || langRaw.includes(" c") || langRaw === "c-lang" || langRaw.includes(" c ")) langKey = "c";
    else langKey = "js";

    const key = `${algo}_${langKey}`;
    // fallback to algo_js if language not found
    codeBox.textContent = codeSnippets[key] || codeSnippets[`${algo}_js`] || codeSnippets[`bubble_js`];
  }

  // Start / Stop handling
  async function startSort() {
    if (running) return;
    running = true;
    stopRequested = false;
    startBtn.disabled = true;
    regenBtn.disabled = true;
    algoSelect.disabled = true;
    sizeRange.disabled = true;
    speedRange.disabled = false; // can adjust speed live
    stopBtn.disabled = false;

    resetStats();
    startTime = performance.now();

    // run chosen algorithm
    const algo = algoSelect.value;
    try {
      if (algo === "bubble") await bubbleSort();
      else if (algo === "selection") await selectionSort();
      else if (algo === "insertion") await insertionSort();
      else if (algo === "merge") await mergeSortWrapper();
      else if (algo === "quick") await quickSortWrapper();
      else if (algo === "heap") await heapSort();
    } catch (e) {
      console.error("Sort interrupted", e);
    }

    const endTime = performance.now();
    const elapsed = endTime - startTime;
    updateTimeTaken(elapsed);

    // update the performance chart once
    updatePerformanceChartAtEnd();

    running = false;
    startBtn.disabled = false;
    regenBtn.disabled = false;
    algoSelect.disabled = false;
    sizeRange.disabled = false;
    stopBtn.disabled = true;
  }

  function stopSort() {
    if (!running) return;
    stopRequested = true;
  }

  // copy code
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(codeBox.textContent).then(() => {
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
    });
  });

  // event listeners
  startBtn.addEventListener("click", startSort);
  stopBtn.addEventListener("click", stopSort);
  regenBtn.addEventListener("click", () => { stopRequested = true; setTimeout(() => { generateArray(); stopRequested = false }, 150) });

  sizeRange.addEventListener("input", () => {
    sizeLabel.textContent = sizeRange.value;
    generateArray();
  });

  speedRange.addEventListener("input", () => {
    speedLabel.textContent = `${speedRange.value}%`;
  });

  algoSelect.addEventListener("change", () => {
    updateComplexityInfo();
    updateCodeSnippet();
  });

  codeLang.addEventListener("change", updateCodeSnippet);

  // initialize
  function init() {
    sizeLabel.textContent = sizeRange.value;
    speedLabel.textContent = `${speedRange.value}%`;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    regenBtn.disabled = false;
    initCharts();
    generateArray();
    updateComplexityInfo();
    updateCodeSnippet();
  }

  init();

})();
