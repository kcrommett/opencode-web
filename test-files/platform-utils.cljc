;; platform-utils.cljc - Clojure Common file (works in both Clojure and ClojureScript)
;; Demonstrates reader conditionals for cross-platform code

(ns platform-utils.core
  #?(:cljs (:require [goog.string :as gstr]
                     [goog.string.format])))

;; Platform detection
(defn platform []
  "Returns the current platform"
  #?(:clj  "Clojure (JVM)"
     :cljs "ClojureScript (JavaScript)"))

(defn platform-version []
  "Returns the platform version"
  #?(:clj  (System/getProperty "java.version")
     :cljs js/process.version))

;; String utilities with platform-specific implementations
(defn format-string [template & args]
  "Format a string with arguments"
  #?(:clj  (apply format template args)
     :cljs (apply gstr/format template args)))

;; Math utilities
(defn random-int [n]
  "Generate a random integer between 0 and n-1"
  #?(:clj  (rand-int n)
     :cljs (.floor js/Math (* (.random js/Math) n))))

(defn sqrt [n]
  "Calculate square root"
  #?(:clj  (Math/sqrt n)
     :cljs (.sqrt js/Math n)))

;; Date/Time utilities
(defn current-timestamp []
  "Get current timestamp in milliseconds"
  #?(:clj  (System/currentTimeMillis)
     :cljs (.now js/Date)))

(defn current-date-string []
  "Get current date as string"
  #?(:clj  (str (java.util.Date.))
     :cljs (.toISOString (js/Date.))))

;; File system operations (only available in Clojure)
(defn read-file [path]
  "Read file contents (JVM only)"
  #?(:clj  (slurp path)
     :cljs (throw (js/Error. "File operations not supported in browser"))))

#?(:clj
   (defn write-file [path contents]
     "Write contents to file (JVM only)"
     (spit path contents)))

;; HTTP utilities with platform-specific implementations
(defn http-get [url]
  "Make HTTP GET request"
  #?(:clj  (slurp url)
     :cljs (js/fetch url)))

;; Collection utilities (work on both platforms)
(defn deep-merge
  "Recursively merge maps"
  [& maps]
  (apply merge-with
         (fn [x y]
           (if (and (map? x) (map? y))
             (deep-merge x y)
             y))
         maps))

(defn index-by
  "Create a map indexed by a key function"
  [key-fn coll]
  (into {} (map (juxt key-fn identity) coll)))

;; Validation utilities
(defn valid-email? [email]
  "Check if string is a valid email"
  (boolean (re-matches #".+@.+\..+" email)))

(defn valid-url? [url]
  "Check if string is a valid URL"
  (boolean (re-matches #"https?://.+" url)))

;; Main function for demonstration
(defn -main [& args]
  (println "=== Platform Utilities Demo ===")
  (println "Platform:" (platform))
  (println "Version:" (platform-version))
  (println "Current timestamp:" (current-timestamp))
  (println "Current date:" (current-date-string))
  (println)
  
  (println "Math utilities:")
  (println "  sqrt(16) =" (sqrt 16))
  (println "  random-int(100) =" (random-int 100))
  (println)
  
  (println "String formatting:")
  (println "  " (format-string "Hello, %s! The answer is %d." "World" 42))
  (println)
  
  (println "Validation:")
  (println "  'test@example.com' valid?" (valid-email? "test@example.com"))
  (println "  'invalid' valid?" (valid-email? "invalid"))
  (println "  'https://example.com' valid?" (valid-url? "https://example.com"))
  (println)
  
  (println "Collection utilities:")
  (let [m1 {:a 1 :b {:c 2}}
        m2 {:b {:d 3} :e 4}]
    (println "  deep-merge" m1 m2 "=" (deep-merge m1 m2))))

;; Export for ClojureScript
#?(:cljs
   (defn ^:export init []
     (-main)))
