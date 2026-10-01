package main
import (
"fmt"
"os"
"gorm.io/driver/postgres"
"gorm.io/gorm"
)
func main() {
db, _ := gorm.Open(postgres.Open(os.Getenv("SUPABASE_DB_URL")), &gorm.Config{})
var profiles []map[string]interface{}
db.Table("profiles").Where("role = ?", "admin").Find(&profiles)
for _, p := range profiles {
fmt.Printf("Admin Profile ID: %v\n", p["id"])
}
}
