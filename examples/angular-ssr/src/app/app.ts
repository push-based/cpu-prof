import { Component, computed } from '@angular/core';
import { computePrimes } from './primes';

@Component({
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly primes = computed(() => computePrimes(60_000));
  protected readonly rows = computed(() => this.primes().slice(-500));
}
