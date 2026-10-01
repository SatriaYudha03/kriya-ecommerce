package main
import (
"fmt"
"os"
"gorm.io/driver/postgres"
"gorm.io/gorm"
)
func main() {
db, _ := gorm.Open(postgres.Open(os.Getenv("SUPABASE_DB_URL")), &gorm.Config{})
var p []map[string]interface{}
db.Table("profiles").Where("id = ?", "a762913e-316d-4d6c-a752-c3e11ac012e3").Find(&p)
for _, item := range p { fmt.Printf("Role: %v\n", item["role"]) }
}
