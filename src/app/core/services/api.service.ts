import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RequestOptions {
  headers?: HttpHeaders | Record<string, string | string[]>;
  params?: HttpParams | Record<string, string | number | boolean | readonly (string | number | boolean)[]>;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.api_base_url;

  // ================= GET =================
  get<T = any>(endpoint: string, optionsOrHeaders?: RequestOptions | any): Observable<T> {
    const { headers, params } = this.normalizeOptions(optionsOrHeaders);
    return this.http.get<T>(this.resolveUrl(endpoint), { headers, params });
  }

  getBlob(endpoint: string, optionsOrHeaders?: RequestOptions | any): Observable<Blob> {
    const { headers, params } = this.normalizeOptions(optionsOrHeaders);
    return this.http.get(this.resolveUrl(endpoint), {
      responseType: 'blob',
      headers,
      params
    });
  }

  // ================= POST =================
  post<T = any>(endpoint: string, body: any, optionsOrHeaders?: RequestOptions | any): Observable<T> {
    const { headers, params } = this.normalizeOptions(optionsOrHeaders);
    return this.http.post<T>(this.resolveUrl(endpoint), body, { headers, params });
  }

  // ================= PUT =================
  put<T = any>(endpoint: string, body: any, optionsOrHeaders?: RequestOptions | any): Observable<T> {
    const { headers, params } = this.normalizeOptions(optionsOrHeaders);
    return this.http.put<T>(this.resolveUrl(endpoint), body, { headers, params });
  }

  // ================= PATCH =================
  patch<T = any>(endpoint: string, body: any = {}, optionsOrHeaders?: RequestOptions | any): Observable<T> {
    const { headers, params } = this.normalizeOptions(optionsOrHeaders);
    return this.http.patch<T>(this.resolveUrl(endpoint), body, { headers, params });
  }

  // ================= DELETE =================
  delete<T = any>(endpoint: string, optionsOrHeaders?: RequestOptions | any): Observable<T> {
    const { headers, params } = this.normalizeOptions(optionsOrHeaders);
    return this.http.delete<T>(this.resolveUrl(endpoint), { headers, params });
  }

  // ================= URL RESOLVER =================
  private resolveUrl(endpoint: string): string {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${cleanEndpoint}`;
  }

  // ================= OPTIONS NORMALIZER =================
  private normalizeOptions(optionsOrHeaders?: RequestOptions | any): {
    headers: HttpHeaders;
    params?: HttpParams;
  } {
    if (!optionsOrHeaders) {
      return { headers: new HttpHeaders() };
    }

    // If already in RequestOptions shape with headers/params
    if (optionsOrHeaders.headers || optionsOrHeaders.params) {
      return {
        headers: this.buildHeaders(optionsOrHeaders.headers),
        params: this.buildParams(optionsOrHeaders.params)
      };
    }

    // Fallback: treated as raw headers object for backward compatibility
    return {
      headers: this.buildHeaders(optionsOrHeaders)
    };
  }

  private buildHeaders(customHeaders?: HttpHeaders | Record<string, string | string[]>): HttpHeaders {
    if (!customHeaders) {
      return new HttpHeaders();
    }
    if (customHeaders instanceof HttpHeaders) {
      return customHeaders;
    }
    let headers = new HttpHeaders();
    Object.keys(customHeaders).forEach(key => {
      headers = headers.set(key, customHeaders[key]);
    });
    return headers;
  }

  private buildParams(customParams?: HttpParams | Record<string, any>): HttpParams | undefined {
    if (!customParams) {
      return undefined;
    }
    if (customParams instanceof HttpParams) {
      return customParams;
    }
    let params = new HttpParams();
    Object.keys(customParams).forEach(key => {
      const val = customParams[key];
      if (val !== null && val !== undefined) {
        params = params.set(key, String(val));
      }
    });
    return params;
  }
}
